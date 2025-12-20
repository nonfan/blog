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
  })

  const tagsMatch = yamlStr.match(/tags:\n((?:\s+-\s+.+\n?)+)/)
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
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\|.*\|/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
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

async function renderMarkdown(body) {
  const idCounts = new Map()
  const renderer = new marked.Renderer()
  const codeBlocks = []

  renderer.heading = function({ text, depth }) {
    const baseId = generateId(String(text))
    const count = idCounts.get(baseId) || 0
    idCounts.set(baseId, count + 1)
    const id = count === 0 ? baseId : `${baseId}-${count}`
    return `<h${depth} id="${id}" class="heading-anchor"><a href="#${id}" class="anchor-link">#</a>${text}</h${depth}>`
  }

  renderer.code = function({ text, lang }) {
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
    codeBlocks.push({ placeholder, code: text, lang: language, title })
    return placeholder
  }

  renderer.codespan = function({ text }) {
    return `<code class="inline-code">${text}</code>`
  }

  // 外部链接在新标签页打开
  renderer.link = function({ href, title, text }) {
    const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'))
    const titleAttr = title ? ` title="${title}"` : ''
    if (isExternal) {
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
    }
    return `<a href="${href}"${titleAttr}>${text}</a>`
  }

  marked.setOptions({ renderer })
  let html = marked.parse(body)
  
  for (const block of codeBlocks) {
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

    posts.push({
      slug,
      title,
      tags: frontmatter.tags || [],
      logo: frontmatter.logo,
      date,
      excerpt,
      pinned: frontmatter.pinned || false
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
