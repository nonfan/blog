import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAllPosts } from '../utils/posts'
import { useConfig } from '../config/ConfigContext'
import { baseUrl } from '../config'
import type { Post } from '../types/post'

// 处理资源路径，给相对路径添加 baseUrl
function getAssetUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  if (!baseUrl) return path
  // 确保路径以 / 开头
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

// 获取当前列数
function getColumnCount() {
  const width = window.innerWidth
  if (width <= 600) return 1
  if (width <= 900) return 2
  if (width <= 1200) return 3
  return 4
}

const posts = getAllPosts()

// 获取所有标签及其文章数量
function getAllTags() {
  const tagCount = new Map<string, number>()
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
    })
  })
  return Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1]) // 按数量降序
    .map(([tag, count]) => ({ tag, count }))
}

const allTags = getAllTags()

interface HomeProps {
  searchQuery: string
}

export default function Home({ searchQuery }: HomeProps) {
  const { config } = useConfig()
  const [columnCount, setColumnCount] = useState(getColumnCount)
  const [searchParams, setSearchParams] = useSearchParams()
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const selectedTag = searchParams.get('tag')

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setColumnCount(getColumnCount())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 设置页面标题
  useEffect(() => {
    document.title = config.site.title
  }, [config.site.title])
  // 支持多关键词搜索（空格分隔），匹配任意关键词即可
  const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0)

  // 从内容中提取匹配关键词的上下文片段
  const getContextSnippet = (content: string, keyword: string, contextLength = 60): string | null => {
    const lowerContent = content.toLowerCase()
    const index = lowerContent.indexOf(keyword.toLowerCase())
    if (index === -1) return null
    
    const start = Math.max(0, index - contextLength)
    const end = Math.min(content.length, index + keyword.length + contextLength)
    
    let snippet = content.slice(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'
    
    return snippet
  }

  // 先按标签筛选，再按关键词搜索（包含全文搜索）
  const filteredPosts = useMemo(() => {
    let result = posts
    
    // 标签筛选
    if (selectedTag) {
      result = result.filter(post => post.tags.includes(selectedTag))
    }
    
    // 关键词搜索（包含全文搜索）
    if (keywords.length > 0) {
      result = result.filter(post => {
        const basicText = `${post.title} ${post.tags.join(' ')} ${post.excerpt}`.toLowerCase()
        const contentText = (post.content || '').toLowerCase()
        return keywords.some(keyword => 
          basicText.includes(keyword) || contentText.includes(keyword)
        )
      })
    }
    
    return result
  }, [selectedTag, keywords])

  // 获取文章显示的摘要（如果搜索匹配在内容中，显示上下文片段）
  const getDisplayExcerpt = (post: Post): string => {
    if (keywords.length === 0) return post.excerpt
    
    // 检查是否在基本信息中匹配
    const basicText = `${post.title} ${post.tags.join(' ')} ${post.excerpt}`.toLowerCase()
    const matchInBasic = keywords.some(k => basicText.includes(k))
    
    if (matchInBasic) return post.excerpt
    
    // 在内容中查找匹配的上下文
    if (post.content) {
      for (const keyword of keywords) {
        const snippet = getContextSnippet(post.content, keyword)
        if (snippet) return snippet
      }
    }
    
    return post.excerpt
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 高亮关键词
  const highlightText = (text: string) => {
    if (keywords.length === 0) return text

    const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) => {
      if (keywords.some(k => part.toLowerCase() === k)) {
        return <mark key={i} className="highlight">{part}</mark>
      }
      return part
    })
  }

  // 将文章分配到各列，置顶文章优先放到各列顶部
  const columns = useMemo(() => {
    const cols: Post[][] = Array.from({ length: columnCount }, () => [])
    
    const pinnedPosts = filteredPosts.filter(post => post.pinned)
    const normalPosts = filteredPosts.filter(post => !post.pinned)
    
    // 先把置顶文章分配到各列顶部
    pinnedPosts.forEach((post, index) => {
      cols[index % columnCount].push(post)
    })
    
    // 然后把普通文章按顺序分配到最短的列
    normalPosts.forEach(post => {
      // 找到当前最短的列
      let shortestCol = 0
      let minLength = cols[0].length
      for (let i = 1; i < columnCount; i++) {
        if (cols[i].length < minLength) {
          minLength = cols[i].length
          shortestCol = i
        }
      }
      cols[shortestCol].push(post)
    })
    
    return cols
  }, [filteredPosts, columnCount])

  return (
    <div className="masonry-container">
      {/* 标签筛选栏 */}
      {allTags.length > 0 && (
        <div className={`tags-filter ${tagsExpanded ? 'expanded' : ''}`}>
          <div className="tags-filter-list">
            <div className="tags-filter-list-inner">
              <button
                className={`tag-filter-btn ${!selectedTag ? 'active' : ''}`}
                onClick={() => setSearchParams({})}
              >
                全部
              </button>
              {allTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSearchParams({ tag })}
                >
                  {tag}
                  <span className="tag-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            className="tags-expand-btn"
            onClick={() => setTagsExpanded(!tagsExpanded)}
          >
            {tagsExpanded ? '收起' : '展开'}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}
      <div className="masonry">
        {columns.map((columnPosts, colIndex) => (
          <div key={colIndex} className="masonry-column">
            {columnPosts.map((post: Post) => (
              <Link to={`/post/${post.slug}`} key={post.slug} className="article-card">
                <div className="card-header">
                  {post.logo && <img src={getAssetUrl(post.logo)} alt="" className="card-logo" loading="lazy" />}
                  <div className="card-title-section">
                    <div className="card-title">{highlightText(post.title)}</div>
                    <div className="card-tags">
                      {post.tags.map(tag => (
                        <span
                          key={tag}
                          className={`tag ${selectedTag === tag ? 'active' : ''}`}
                          onClick={e => {
                            e.preventDefault()
                            setSearchParams({ tag })
                          }}
                        >
                          {highlightText(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card-content">{highlightText(getDisplayExcerpt(post))}</div>
                <div className="card-footer">
                  {post.pinned && (
                    <span className="pinned-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                      </svg>
                      置顶
                    </span>
                  )}
                  <span className="card-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {formatDate(post.date)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
