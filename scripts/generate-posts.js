import { execSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { marked } from 'marked'
import { codeToHtml } from 'shiki'

const postsDir = './posts'
const outputFile = './src/generated/posts.json'
const htmlDir = './src/generated/html'

// 确保 html 目录存在
if (!existsSync(htmlDir)) {
  mkdirSync(htmlDir, { recursive: true })
}

function getGitDate(filePath) {
  try {
    const date = execSync(`git log -1 --format=%cI -- "${filePath}"`, { encoding: 'utf-8' }).trim()
    return date || new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: normalized }

  const [, yamlStr, body] = match
  const frontmatter = {}

  yamlStr.split('\n').forEach(line => {
    const titleMatch = line.match(/^title:\s*(.+)$/)
    if (titleMatch) frontmatter.title = titleMatch[1].trim()

    const logoMatch = line.match(/^logo:\s*(.+)$/)
    if (logoMatch) frontmatter.logo = logoMatch[1].trim()

    const pinnedMatch = line.match(/^pinned:\s*(.+)$/i)
    if (pinnedMatch) {
      const value = pinnedMatch[1].trim().toLowerCase()
      if (value === 'true') {
        frontmatter.pinned = true
      } else if (value === 'false') {
        frontmatter.pinned = false
      } else {
        const num = parseInt(value, 10)
        frontmatter.pinned = isNaN(num) ? false : num
      }
    }

    const descMatch = line.match(/^description:\s*(.+)$/)
    if (descMatch) frontmatter.description = descMatch[1].trim()

    const typeMatch = line.match(/^type:\s*(.+)$/)
    if (typeMatch) frontmatter.type = typeMatch[1].trim()
  })

  const tagsMatch = yamlStr.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/)
  if (tagsMatch) {
    frontmatter.tags = tagsMatch[1]
      .split('\n')
      .map(line => line.match(/^\s+-\s+(.+)$/)?.[1]?.trim())
      .filter(Boolean)
  } else {
    frontmatter.tags = []
  }

  return { frontmatter, body }
}

function getTitleFromBody(body) {
  const match = body.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function cleanText(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')           // 代码块
    .replace(/\|.*\|/g, '')                    // 表格
    .replace(/`[^`]+`/g, '')                   // 行内代码
    .replace(/^#{1,6}\s+/gm, '')               // 标题标记
    .replace(/^[-*+]\s+/gm, '')                // 无序列表
    .replace(/^\d+\.\s+/gm, '')                // 有序列表
    .replace(/^>\s*/gm, '')                    // 引用
    .replace(/!\[.*?\]\(.*?\)/g, '')           // 图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // 链接，保留文字
    .replace(/\[\^[^\]]+\]/g, '')              // 脚注引用 [^note]
    .replace(/\[\^[^\]]+\]:.*/g, '')           // 脚注定义
    .replace(/<[^>]+>/g, '')                   // HTML 标签
    .replace(/\*\*([^*]+)\*\*/g, '$1')         // 粗体
    .replace(/\*([^*]+)\*/g, '$1')             // 斜体
    .replace(/__([^_]+)__/g, '$1')             // 粗体
    .replace(/_([^_]+)_/g, '$1')               // 斜体
    .replace(/~~([^~]+)~~/g, '$1')             // 删除线
    .replace(/^---.*$/gm, '')                  // 分割线
    .replace(/\n+/g, ' ')                      // 多个换行变空格
    .replace(/\s+/g, ' ')                      // 多个空格变一个
    .trim()
}

function getExcerpt(body, maxLength = 150) {
  const cleanedBody = body.replace(/```[\s\S]*?```/g, '')
  
  // 1. 先检查第一个标题之前是否有文本
  const firstHeadingMatch = cleanedBody.match(/^#{1,6}\s+/m)
  if (firstHeadingMatch && firstHeadingMatch.index > 0) {
    const text = cleanText(cleanedBody.slice(0, firstHeadingMatch.index))
    if (text) {
      return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
    }
  }
  
  // 2. 按标题级别依次查找
  for (const level of [1, 2, 3]) {
    const hashes = '#'.repeat(level)
    const headingRegex = new RegExp('^' + hashes + '\\s+.+$', 'm')
    
    const headingMatch = cleanedBody.match(headingRegex)
    if (headingMatch) {
      const afterHeading = cleanedBody.slice(headingMatch.index + headingMatch[0].length)
      const nextMatch = afterHeading.match(/^#{1,3}\s+/m)
      const section = nextMatch ? afterHeading.slice(0, nextMatch.index) : afterHeading
      
      const text = cleanText(section)
      if (text) {
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
      }
    }
  }
  
  const text = cleanText(cleanedBody)
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

function generateId(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    || 'heading'
}

// 全局变量，用于在 renderer 中共享状态
let currentIdCounts = new Map()
let currentCodeBlocks = []

// 配置 marked renderer
const renderer = {
  // 带文字的分割线: ---文字---
  paragraph(text) {
    const dividerMatch = String(text).match(/^---(.+)---$/)
    if (dividerMatch) {
      const label = dividerMatch[1].trim()
      return `<div class="divider-with-text"><span class="divider-text">${label}</span></div>`
    }
    return `<p>${text}</p>`
  },

  heading(text, depth) {
    const baseId = generateId(String(text))
    const count = currentIdCounts.get(baseId) || 0
    currentIdCounts.set(baseId, count + 1)
    const id = count === 0 ? baseId : `${baseId}-${count}`
    return `<h${depth} id="${id}" class="heading-anchor"><a href="#${id}" class="anchor-link">#</a>${text}</h${depth}>`
  },

  code(code, lang) {
    let language = lang || 'text'
    let title = ''
    
    if (lang) {
      const titleMatch = lang.match(/^(\w+)\s+\[(.+)\]$/)
      if (titleMatch) {
        language = titleMatch[1]
        title = titleMatch[2]
      }
    }
    
    const placeholder = `<!--CODE_BLOCK_${Math.random().toString(36).slice(2)}-->`
    currentCodeBlocks.push({ placeholder, code, lang: language, title })
    return placeholder
  },

  codespan(text) {
    return `<code class="inline-code">${text}</code>`
  },

  // 外部链接在新标签页打开
  link(href, title, text) {
    const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'))
    const titleAttr = title ? ` title="${title}"` : ''
    if (isExternal) {
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
    }
    return `<a href="${href}"${titleAttr}>${text}</a>`
  },

  // 图片懒加载
  image(href, title, text) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}" alt="${text || ''}"${titleAttr} loading="lazy" />`
  }
}

marked.use({ renderer })

// 容器类型的默认标题
const containerTitles = {
  info: '信息',
  tip: '提示',
  warning: '警告',
  danger: '危险',
  details: '详情'
}

// 预处理自定义容器语法 :::type
function preprocessContainers(body) {
  // 匹配 :::type [title] ... :::
  const containerRegex = /^:::\s*(info|tip|warning|danger|details)\s*(.*)?\n([\s\S]*?)^:::\s*$/gm
  
  return body.replace(containerRegex, (match, type, customTitle, content) => {
    const title = customTitle?.trim() || containerTitles[type] || type
    const innerContent = content.trim()
    
    if (type === 'details') {
      return `<details class="custom-block details">
<summary>${title}</summary>

${innerContent}

</details>

`
    }
    
    return `<div class="custom-block ${type}">
<p class="custom-block-title">${title}</p>

${innerContent}

</div>

`
  })
}

async function renderMarkdown(body) {
  // 重置状态
  currentIdCounts = new Map()
  currentCodeBlocks = []

  // 预处理自定义容器
  const processedBody = preprocessContainers(body)

  let html = marked.parse(processedBody)
  
  for (const block of currentCodeBlocks) {
    try {
      const lightHtml = await codeToHtml(block.code, { lang: block.lang, theme: 'one-light' })
      const darkHtml = await codeToHtml(block.code, { lang: block.lang, theme: 'one-dark-pro' })
      
      const hasTitle = !!block.title
      const titleHtml = hasTitle ? `<div class="code-title">${block.title}</div>` : ''
      
      const codeBlockHtml = `
<div class="code-block-wrapper">
  <div class="code-header">
    <div class="code-dots${hasTitle ? ' has-title' : ''}">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
    </div>
    ${titleHtml}
    <div class="code-lang">${block.lang}</div>
  </div>
  <div class="code-content">
    <button class="code-copy" data-code="${encodeURIComponent(block.code)}" title="复制代码">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
    <div class="code-block code-light">${lightHtml}</div>
    <div class="code-block code-dark">${darkHtml}</div>
  </div>
</div>`
      html = html.replace(block.placeholder, codeBlockHtml)
    } catch (e) {
      console.error(`Error highlighting ${block.lang}:`, e.message)
      html = html.replace(block.placeholder, `<pre><code>${block.code}</code></pre>`)
    }
  }
  
  return html
}

async function main() {
  const files = readdirSync(postsDir).filter(f => f.endsWith('.mdx'))
  const posts = []

  for (const file of files) {
    const filePath = join(postsDir, file)
    const content = readFileSync(filePath, 'utf-8')
    const slug = file.replace('.mdx', '')
    const date = getGitDate(filePath)
    const { frontmatter, body } = parseFrontmatter(content)

    const titleFromBody = getTitleFromBody(body)
    const title = frontmatter.title || titleFromBody || slug

    let renderBody = body
    if (!frontmatter.title && titleFromBody) {
      renderBody = body.replace(/^#\s+.+\n?/m, '')
    }

    const html = await renderMarkdown(renderBody)
    writeFileSync(join(htmlDir, `${slug}.html`), html)

    const excerpt = frontmatter.description || getExcerpt(body)

    // 提取纯文本内容用于全文搜索（限制长度避免文件过大）
    const searchContent = cleanText(body).slice(0, 3000)

    posts.push({
      slug,
      title,
      tags: frontmatter.tags || [],
      logo: frontmatter.logo,
      date,
      excerpt,
      content: searchContent, // 用于全文搜索
      pinned: frontmatter.pinned || false,
      type: frontmatter.type || 'tech'  // 默认为技术文章
    })
  }

  posts.sort((a, b) => {
    // 置顶文章优先
    // 数字类型的 pinned 优先于 true，数字越小越靠前
    // true 类型的 pinned 按日期排序
    const aIsNumber = typeof a.pinned === 'number'
    const bIsNumber = typeof b.pinned === 'number'
    const aIsPinned = a.pinned === true || aIsNumber
    const bIsPinned = b.pinned === true || bIsNumber
    
    // 非置顶文章排在最后
    if (aIsPinned && !bIsPinned) return -1
    if (!aIsPinned && bIsPinned) return 1
    
    // 都是置顶文章
    if (aIsPinned && bIsPinned) {
      // 数字优先于 true
      if (aIsNumber && !bIsNumber) return -1
      if (!aIsNumber && bIsNumber) return 1
      // 都是数字，按数字排序
      if (aIsNumber && bIsNumber) return a.pinned - b.pinned
      // 都是 true，按日期排序
    }
    
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  writeFileSync(outputFile, JSON.stringify(posts, null, 2))
  console.log(`Generated ${posts.length} posts to ${outputFile}`)
}

main().catch(console.error)
