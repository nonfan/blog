import { useConfig } from '../config/ConfigContext'

interface PostFooterProps {
  slug: string
  lastUpdated?: string
}

export default function PostFooter({ slug, lastUpdated }: PostFooterProps) {
  const { config } = useConfig()
  const { showEditLink, showLastUpdated } = config.features
  const { repo, branch, postsDir } = config.github

  // 如果都不显示，返回 null
  if (!showEditLink && !showLastUpdated) return null

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

  return (
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
  )
}
