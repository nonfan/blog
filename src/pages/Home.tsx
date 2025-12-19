import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllPosts } from '../utils/posts'
import { useConfig } from '../config/ConfigContext'
import type { Post } from '../types/post'

const posts = getAllPosts()

interface HomeProps {
  searchQuery: string
}

export default function Home({ searchQuery }: HomeProps) {
  const { config } = useConfig()

  // 设置页面标题
  useEffect(() => {
    document.title = config.site.title
  }, [config.site.title])
  // 支持多关键词搜索（空格分隔），匹配任意关键词即可
  const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0)

  const filteredPosts =
    keywords.length === 0
      ? posts
      : posts.filter(post => {
          const searchText = `${post.title} ${post.tags.join(' ')} ${post.excerpt}`.toLowerCase()
          return keywords.some(keyword => searchText.includes(keyword))
        })

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

  return (
    <div className="masonry-container">
      <div className="masonry">
        {filteredPosts.map((post: Post) => (
          <Link to={`/post/${post.slug}`} key={post.slug} className="article-card">
            <div className="card-header">
              {post.logo && <img src={post.logo} alt="" className="card-logo" />}
              <div className="card-title-section">
                <div className="card-title">{highlightText(post.title)}</div>
                <div className="card-tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="tag">
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
