import { execSync } from 'child_process'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { marked } from 'marked'
import { codeToHtml } from 'shiki'
import katex from 'katex'
import markedFootnote from 'marked-footnote'

// 配置 marked 使用脚注扩展
marked.use(markedFootnote({
  description: '脚注',
  refMarkers: true
}))

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

    const tocMatch = line.match(/^toc:\s*(.+)$/i)
    if (tocMatch) {
      const value = tocMatch[1].trim().toLowerCase()
      frontmatter.toc = value !== 'false'
    }
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
  info: 'INFO',
  tip: 'TIP',
  warning: 'WARNING',
  danger: 'DANGER',
  details: 'DETAILS'
}

// 预处理数学公式
function preprocessMath(body) {
  // 先保护代码块，避免代码块内的公式被渲染
  const codeBlocks = []
  body = body.replace(/````[\s\S]*?````|```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })

  // 处理块级公式 $$ ... $$
  body = body.replace(/^\$\$\n([\s\S]*?)\n\$\$$/gm, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false
      })
    } catch (e) {
      console.error('KaTeX block error:', e.message)
      return match
    }
  })

  // 处理行内公式 $...$（不跨行）
  body = body.replace(/\$([^\$\n]+)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false
      })
    } catch (e) {
      console.error('KaTeX inline error:', e.message)
      return match
    }
  })

  // 恢复代码块
  body = body.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
    return codeBlocks[parseInt(index)]
  })

  return body
}

// 预处理自定义容器语法 :::type
function preprocessContainers(body) {
  // 匹配 :::type [title]\n content \n:::
  // 自定义标题必须在同一行，且不能包含换行
  const containerRegex = /^:::\s*(info|tip|warning|danger|details)(?:[ \t]+([^\n]*))?\n([\s\S]*?)^:::\s*$/gm
  
  return body.replace(containerRegex, (match, type, customTitle, content) => {
    // 如果有自定义标题则使用，否则使用默认标题
    const title = customTitle?.trim() || containerTitles[type] || type.toUpperCase()
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

// 代码组计数器
let codeGroupCounter = 0

// 每日打卡日历计数器
let dailyCalendarCounter = 0

// 预处理每日打卡日历语法 :::daily
function preprocessDailyCalendar(body) {
  const dailyRegex = /^:::\s*daily\s*\n([\s\S]*?)^:::\s*$/gm
  
  return body.replace(dailyRegex, (match, content) => {
    const lines = content.trim().split('\n')
    
    // 第一行是任务标题（支持 - [ ] 或 - [x] 格式）
    const titleLine = lines[0]
    const titleMatch = titleLine.match(/^-\s*\[([ x])\]\s*(.+)$/)
    if (!titleMatch) return match
    
    const isTaskCompleted = titleMatch[1] === 'x'
    const calendarTitle = titleMatch[2].trim()
    const calendarId = `daily-calendar-${dailyCalendarCounter++}`
    
    // 解析日期数据，格式：2025-01: 1,2,3,5,6
    const monthData = {}
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const lineMatch = line.match(/^(\d{4}-\d{2}):\s*(.+)$/)
      if (lineMatch) {
        const [, yearMonth, daysStr] = lineMatch
        const days = daysStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
        monthData[yearMonth] = days
      }
    }
    
    // 生成日历 HTML
    const months = Object.keys(monthData).sort()
    if (months.length === 0) return match
    
    let calendarsHtml = ''
    
    for (const yearMonth of months) {
      const [year, month] = yearMonth.split('-').map(Number)
      const completedDays = new Set(monthData[yearMonth])
      
      // 获取该月的天数和第一天是星期几
      const daysInMonth = new Date(year, month, 0).getDate()
      const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
      
      // 计算完成率
      const completedCount = completedDays.size
      const percentage = Math.round((completedCount / daysInMonth) * 100)
      
      // 生成日历格子
      let daysHtml = ''
      
      // 填充月初空白
      for (let i = 0; i < firstDayOfWeek; i++) {
        daysHtml += '<span class="daily-day empty"></span>'
      }
      
      // 填充日期
      for (let day = 1; day <= daysInMonth; day++) {
        const isCompleted = completedDays.has(day)
        const className = isCompleted ? 'daily-day completed' : 'daily-day'
        daysHtml += `<span class="${className}" data-day="${day}">${day}</span>`
      }
      
      const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      
      calendarsHtml += `
<div class="daily-month">
  <div class="daily-month-header">
    <span class="daily-month-title">${year}年${monthNames[month]}</span>
    <span class="daily-month-stats">${completedCount}/${daysInMonth} (${percentage}%)</span>
  </div>
  <div class="daily-weekdays">
    <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
  </div>
  <div class="daily-days">
    ${daysHtml}
  </div>
</div>`
    }
    
    // 计算总完成率
    const totalDays = months.reduce((sum, ym) => {
      const [y, m] = ym.split('-').map(Number)
      return sum + new Date(y, m, 0).getDate()
    }, 0)
    const totalCompleted = months.reduce((sum, ym) => sum + monthData[ym].length, 0)
    const totalPercentage = Math.round((totalCompleted / totalDays) * 100)
    
    // 任务完成状态的 checkbox
    const checkboxHtml = isTaskCompleted 
      ? '<input type="checkbox" checked disabled class="daily-checkbox">'
      : '<input type="checkbox" disabled class="daily-checkbox">'
    
    return `<div class="daily-calendar" id="${calendarId}">
  <div class="daily-header">
    <span class="daily-title">${checkboxHtml}${calendarTitle}</span>
    <span class="daily-total">${totalCompleted}/${totalDays} 天 (${totalPercentage}%)</span>
  </div>
  <div class="daily-months">
    ${calendarsHtml}
  </div>
</div>

`
  })
}

// 预处理代码组语法 ::: code-group
function preprocessCodeGroups(body) {
  const codeGroupRegex = /^:::\s*code-group\s*\n([\s\S]*?)^:::\s*$/gm

  return body.replace(codeGroupRegex, (match, content) => {
    // 提取所有代码块
    const codeBlockRegex = /```(\w+)(?:\s+\[([^\]]+)\])?\n([\s\S]*?)```/g
    const blocks = []
    let blockMatch

    while ((blockMatch = codeBlockRegex.exec(content)) !== null) {
      const [, lang, title, code] = blockMatch
      blocks.push({
        lang,
        title: title || lang,
        code: code.trim()
      })
    }

    if (blocks.length === 0) return match

    const groupId = `code-group-${codeGroupCounter++}`

    // 生成标签 HTML，添加 data-lang 属性
    const tabsHtml = blocks
      .map(
        (block, index) =>
          `<button class="code-group-tab${index === 0 ? ' active' : ''}" data-tab="${groupId}-${index}" data-lang="${block.lang}">${block.title}</button>`
      )
      .join('')

    // 生成代码块占位符（稍后会被替换为高亮代码）
    const panels = blocks
      .map((block, index) => {
        const placeholder = `<!--CODE_GROUP_BLOCK_${groupId}_${index}-->`
        currentCodeBlocks.push({
          placeholder,
          code: block.code,
          lang: block.lang,
          title: block.title,
          isCodeGroup: true,
          groupId,
          index
        })
        return `<div class="code-group-panel${index === 0 ? ' active' : ''}" data-panel="${groupId}-${index}">${placeholder}</div>`
      })
      .join('\n')

    // header 放在代码组外层，第一个代码块的语言作为初始显示
    const firstLang = blocks[0].lang
    return `<div class="code-group" data-group="${groupId}">
<div class="code-group-header">
  <div class="code-dots">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
  </div>
  <div class="code-group-tabs">${tabsHtml}</div>
  <div class="code-lang">${firstLang}</div>
</div>
<div class="code-group-panels">
${panels}
</div>
</div>

`
  })
}

async function renderMarkdown(body) {
  // 重置状态
  currentIdCounts = new Map()
  currentCodeBlocks = []
  codeGroupCounter = 0
  dailyCalendarCounter = 0

  // 预处理数学公式（必须在其他处理之前）
  let processedBody = preprocessMath(body)
  // 预处理代码组（必须在容器之前）
  processedBody = preprocessCodeGroups(processedBody)
  // 预处理每日打卡日历
  processedBody = preprocessDailyCalendar(processedBody)
  // 预处理自定义容器
  processedBody = preprocessContainers(processedBody)

  let html = marked.parse(processedBody)
  
  for (const block of currentCodeBlocks) {
    try {
      const lightHtml = await codeToHtml(block.code, { lang: block.lang, theme: 'one-light' })
      const darkHtml = await codeToHtml(block.code, { lang: block.lang, theme: 'one-dark-pro' })
      
      let codeBlockHtml
      
      if (block.isCodeGroup) {
        // 代码组内的代码块：不显示 header（header 在代码组外层）
        codeBlockHtml = `<div class="code-block-wrapper code-group-block">
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
      } else {
        // 普通代码块
        const hasTitle = !!block.title
        const titleHtml = hasTitle ? `<div class="code-title">${block.title}</div>` : ''
        
        codeBlockHtml = `
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
      }
      
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
      type: frontmatter.type || 'tech',  // 默认为技术文章
      toc: frontmatter.toc !== false  // 默认显示目录
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
