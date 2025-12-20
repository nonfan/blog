import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useConfig } from '../config/ConfigContext'
import { getAllPosts } from '../utils/posts'
import type { Post } from '../types/post'

interface PostFooterProps {
  slug: string
  lastUpdated?: string
  tags?: string[]
}

// 查找相关文章（优先同标签）
function findRelatedPosts(currentSlug: string, currentTags: string[], allPosts: Post[]) {
  // 排除当前文章
  const otherPosts = allPosts.filter(p => p.slug !== currentSlug)
  
  // 计算每篇文章与当前文章的标签匹配数
  const postsWithScore = otherPosts.map(post => {
    const matchCount = post.tags.filter(tag => currentTags.includes(tag)).length
    return { post, matchCount }
  })
  
  // 按标签匹配数降序，再按日期降序排序
  postsWithScore.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime()
  })
  
  // 按日期排序的所有文章
  const sortedByDate = [...allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const currentDateIndex = sortedByDate.findIndex(p => p.slug === currentSlug)
  
  // 上一篇：优先同标签，否则按日期取更新的
  let prevPost: Post | null = null
  // 下一篇：优先同标签，否则按日期取更旧的
  let nextPost: Post | null = null
  
  // 有同标签的文章
  const sameTagPosts = postsWithScore.filter(p => p.matchCount > 0)
  
  if (sameTagPosts.length > 0) {
    // 同标签文章按日期排序
    const sameTagSorted = sameTagPosts
      .map(p => p.post)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    const currentInSameTag = sameTagSorted.findIndex(p => p.slug === currentSlug)
    
    // 在同标签中找上一篇（更新的）和下一篇（更旧的）
    if (currentInSameTag === -1) {
      // 当前文章不在同标签列表中，取第一个作为推荐
      prevPost = sameTagSorted[0] || null
      nextPost = sameTagSorted[1] || null
    } else {
      prevPost = sameTagSorted[currentInSameTag - 1] || null
      nextPost = sameTagSorted[currentInSameTag + 1] || null
    }
  }
  
  // 如果没有同标签的，按日期顺序
  if (!prevPost && currentDateIndex > 0) {
    prevPost = sortedByDate[currentDateIndex - 1]
  }
  if (!nextPost && currentDateIndex < sortedByDate.length - 1) {
    nextPost = sortedByDate[currentDateIndex + 1]
  }
  
  return { prevPost, nextPost }
}

export default function PostFooter({ slug, lastUpdated, tags = [] }: PostFooterProps) {
  const { config } = useConfig()
  const { showEditLink, showLastUpdated } = config.features
  const { repo, branch, postsDir } = config.github

  const allPosts = useMemo(() => getAllPosts(), [])
  const { prevPost, nextPost } = useMemo(
    () => findRelatedPosts(slug, tags, allPosts),
    [slug, tags, allPosts]
  )

  const editUrl = repo
    ? `https://github.com/${repo}/edit/${branch}/${postsDir}/${slug}.mdx`
    : null

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasEditOrUpdate = (showEditLink && editUrl) || (showLastUpdated && lastUpdated)
  const hasNavigation = prevPost || nextPost

  if (!hasEditOrUpdate && !hasNavigation) return null

  return (
    <div className="post-footer-wrapper">
      {/* 编辑链接和更新时间 */}
      {hasEditOrUpdate && (
        <div className="post-footer">
          {showEditLink && editUrl && (
            <a href={editUrl} target="_blank" rel="noopener noreferrer" className="edit-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              在 GitHub 上编辑此页面
            </a>
          )}
          {showLastUpdated && lastUpdated && (
            <span className="last-updated">最后更新于: {formatDate(lastUpdated)}</span>
          )}
        </div>
      )}

      {/* 上一篇/下一篇导航 */}
      {hasNavigation && (
        <nav className="post-navigation">
          <div className="post-nav-item post-nav-prev">
            {prevPost && (
              <Link to={`/post/${prevPost.slug}`} className="post-nav-link">
                <span className="post-nav-label">上一篇</span>
                <span className="post-nav-title">{prevPost.title}</span>
              </Link>
            )}
          </div>
          <div className="post-nav-item post-nav-next">
            {nextPost && (
              <Link to={`/post/${nextPost.slug}`} className="post-nav-link">
                <span className="post-nav-label">下一篇</span>
                <span className="post-nav-title">{nextPost.title}</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
