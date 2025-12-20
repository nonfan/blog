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

  // 先按标签筛选，再按关键词搜索
  const filteredPosts = useMemo(() => {
    let result = posts
    
    // 标签筛选
    if (selectedTag) {
      result = result.filter(post => post.tags.includes(selectedTag))
    }
    
    // 关键词搜索
    if (keywords.length > 0) {
      result = result.filter(post => {
        const searchText = `${post.title} ${post.tags.join(' ')} ${post.excerpt}`.toLowerCase()
        return keywords.some(keyword => searchText.includes(keyword))
      })
    }
    
    return result
  }, [selectedTag, keywords])

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

  // 分离置顶和普通文章，然后重新排列让置顶文章分布在各列顶部
  const sortedPosts = useMemo(() => {
    const pinnedPosts = filteredPosts.filter(post => post.pinned)
    const normalPosts = filteredPosts.filter(post => !post.pinned)
    
    // 如果没有置顶文章或只有一列，直接返回原顺序
    if (pinnedPosts.length === 0 || columnCount === 1) {
      return filteredPosts
    }
    
    // CSS column 是按列从上到下填充的
    // 要让置顶文章分布在各列顶部，需要计算每列有多少文章，然后把置顶文章插入到正确位置
    const totalPosts = filteredPosts.length
    const postsPerColumn = Math.ceil(totalPosts / columnCount)
    
    // 创建结果数组，先用普通文章填充
    const result: (Post | null)[] = new Array(totalPosts).fill(null)
    
    // 计算每列顶部的位置索引，并放置置顶文章
    const pinnedCount = Math.min(pinnedPosts.length, columnCount)
    for (let i = 0; i < pinnedCount; i++) {
      const position = i * postsPerColumn
      if (position < totalPosts) {
        result[position] = pinnedPosts[i]
      }
    }
    
    // 用普通文章填充剩余位置
    let normalIndex = 0
    // 先添加超出列数的置顶文章
    const extraPinned = pinnedPosts.slice(columnCount)
    
    for (let i = 0; i < result.length; i++) {
      if (result[i] === null) {
        if (extraPinned.length > 0) {
          result[i] = extraPinned.shift()!
        } else if (normalIndex < normalPosts.length) {
          result[i] = normalPosts[normalIndex++]
        }
      }
    }
    
    return result.filter(Boolean) as Post[]
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
        {sortedPosts.map((post: Post) => (
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
            <div className="card-content">{highlightText(post.excerpt)}</div>
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
    </div>
  )
}
