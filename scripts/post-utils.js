import { marked } from 'marked'

/**
 * 解析 frontmatter
 */
export function parseFrontmatter(content) {
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

/**
 * 从正文中提取标题
 */
export function getTitleFromBody(body) {
  const match = body.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * 清理文本，移除 Markdown 语法
 */
export function cleanText(text) {
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

/**
 * 获取文章摘要
 */
export function getExcerpt(body, maxLength = 150) {
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

/**
 * 生成标题 ID
 */
export function generateId(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    || 'heading'
}

/**
 * 文章排序函数
 */
export function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    const aIsNumber = typeof a.pinned === 'number'
    const bIsNumber = typeof b.pinned === 'number'
    const aIsPinned = a.pinned === true || aIsNumber
    const bIsPinned = b.pinned === true || bIsNumber
    
    if (aIsPinned && !bIsPinned) return -1
    if (!aIsPinned && bIsPinned) return 1
    
    if (aIsPinned && bIsPinned) {
      if (aIsNumber && !bIsNumber) return -1
      if (!aIsNumber && bIsNumber) return 1
      if (aIsNumber && bIsNumber) return a.pinned - b.pinned
    }
    
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

/**
 * 配置 marked renderer
 */
export function createMarkedRenderer() {
  let idCounts = new Map()

  const renderer = {
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
      const count = idCounts.get(baseId) || 0
      idCounts.set(baseId, count + 1)
      const id = count === 0 ? baseId : `${baseId}-${count}`
      return `<h${depth} id="${id}" class="heading-anchor"><a href="#${id}" class="anchor-link">#</a>${text}</h${depth}>`
    },

    codespan(text) {
      return `<code class="inline-code">${text}</code>`
    },

    link(href, title, text) {
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'))
      const titleAttr = title ? ` title="${title}"` : ''
      if (isExternal) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
      }
      return `<a href="${href}"${titleAttr}>${text}</a>`
    },

    image(href, title, text) {
      const titleAttr = title ? ` title="${title}"` : ''
      return `<img src="${href}" alt="${text || ''}"${titleAttr} loading="lazy" />`
    }
  }

  return {
    renderer,
    resetIdCounts: () => { idCounts = new Map() }
  }
}

// 容器类型的默认标题
const containerTitles = {
  info: 'INFO',
  tip: 'TIP',
  warning: 'WARNING',
  danger: 'DANGER',
  details: 'DETAILS'
}

/**
 * 预处理自定义容器语法 :::type
 */
export function preprocessContainers(body) {
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

/**
 * 生成代码块 header HTML
 * @param {Object} options - 配置选项
 * @param {string} options.lang - 代码语言
 * @param {string} [options.title] - 代码块标题
 * @param {boolean} [options.isCodeGroup] - 是否是代码组
 * @returns {string} HTML 字符串
 */
export function generateCodeBlockHeader({ lang, title, isCodeGroup = false }) {
  if (isCodeGroup) {
    // 代码组的 header 不需要竖线，竖线在 tabs 上
    return `<div class="code-group-header">
  <div class="code-dots">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
  </div>
  <div class="code-lang">${lang}</div>
</div>`
  }

  // 普通代码块：有标题时添加 has-title 类（用于显示竖线）
  const hasTitle = !!title
  const dotsClass = hasTitle ? 'code-dots has-title' : 'code-dots'
  const titleHtml = hasTitle ? `<div class="code-title">${title}</div>` : ''

  return `<div class="code-header">
  <div class="${dotsClass}">
    <span class="dot red"></span>
    <span class="dot yellow"></span>
    <span class="dot green"></span>
  </div>
  ${titleHtml}
  <div class="code-lang">${lang}</div>
</div>`
}

// 创建默认 renderer 并配置 marked
const { renderer } = createMarkedRenderer()
marked.use({ renderer })

export { marked }

/**
 * 代码块保护工具
 * 用于在预处理时保护代码块内容不被解析
 * @returns {Object} 包含 protect 和 restore 方法的对象
 */
export function createCodeBlockProtector() {
  const codeBlocks = []
  const placeholder = '__PROTECTED_CODE_BLOCK_'
  
  return {
    /**
     * 保护代码块，将其替换为占位符
     * @param {string} body - 原始内容
     * @returns {string} - 替换后的内容
     */
    protect(body) {
      // 匹配 ```` ``` 和行内 ` 代码（按长度优先匹配）
      return body.replace(/````[\s\S]*?````|```[\s\S]*?```|`[^`\n]+`/g, (match) => {
        codeBlocks.push(match)
        return `${placeholder}${codeBlocks.length - 1}__`
      })
    },
    
    /**
     * 恢复代码块
     * @param {string} body - 包含占位符的内容
     * @returns {string} - 恢复后的内容
     */
    restore(body) {
      return body.replace(new RegExp(`${placeholder}(\\d+)__`, 'g'), (_, index) => {
        return codeBlocks[parseInt(index)]
      })
    },
    
    /**
     * 获取已保护的代码块数量
     * @returns {number}
     */
    getCount() {
      return codeBlocks.length
    }
  }
}

/**
 * 预处理每日打卡日历语法 :::daily
 * @param {string} body - Markdown 内容
 * @returns {string} - 处理后的内容
 */
export function preprocessDailyCalendar(body) {
  // 使用代码块保护器
  const protector = createCodeBlockProtector()
  body = protector.protect(body)
  
  let calendarCounter = 0
  const dailyRegex = /^:::\s*daily\s+(.+)\n([\s\S]*?)^:::\s*$/gm
  
  body = body.replace(dailyRegex, (match, titleLine, content) => {
    const calendarTitle = titleLine.trim()
    if (!calendarTitle) return match
    
    const calendarId = `daily-calendar-${calendarCounter++}`
    const lines = content.trim().split('\n')
    
    // 解析日期数据，格式：2025-01: 1,2,3,5,6 或 2025-01: （空）
    const monthData = {}
    for (const line of lines) {
      const lineMatch = line.match(/^(\d{4}-\d{2}):\s*(.*)$/)
      if (lineMatch) {
        const [, yearMonth, daysStr] = lineMatch
        const days = daysStr ? daysStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)) : []
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
    
    // 100% 完成时自动勾选
    const isFullyCompleted = totalPercentage === 100
    const checkboxHtml = isFullyCompleted
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
  
  // 恢复代码块
  return protector.restore(body)
}
