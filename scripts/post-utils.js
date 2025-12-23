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

// 创建默认 renderer 并配置 marked
const { renderer } = createMarkedRenderer()
marked.use({ renderer })

export { marked }
