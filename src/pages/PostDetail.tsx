import { useParams, Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getPostBySlug } from '../utils/posts'
import { useMobileMenu } from '../App'
import { useConfig } from '../config/ConfigContext'
import PostFooter from '../components/PostFooter'

interface TocItem {
  id: string
  text: string
  level: number
}

// 导入所有预渲染的 HTML 文件
const htmlModules = import.meta.glob<string>('/src/generated/html/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? getPostBySlug(slug)?.post : null
  const { setToc, setActiveId, activeId } = useMobileMenu()
  const { config } = useConfig()
  const [showBackTop, setShowBackTop] = useState(false)

  // 监听滚动显示回到顶部
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 获取预渲染的 HTML
  const html = slug ? htmlModules[`/src/generated/html/${slug}.html`] || '' : ''

  // 从 HTML 中提取目录
  const toc = useMemo(() => {
    const items: TocItem[] = []
    const regex = /<h([23])\s+id="([^"]+)"[^>]*>.*?#<\/a>([^<]+)<\/h[23]>/g
    let match
    while ((match = regex.exec(html)) !== null) {
      items.push({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3],
      })
    }
    return items
  }, [html])

  // 同步目录到移动端菜单
  useEffect(() => {
    setToc(toc)
    return () => setToc([])
  }, [toc, setToc])

  // 设置页面标题
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | ${config.site.title}`
    }
    return () => {
      document.title = config.site.title
    }
  }, [post, config.site.title])

  // 监听滚动，更新当前活动的标题
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-100px 0px -80% 0px' }
    )

    const timer = setTimeout(() => {
      const headings = document.querySelectorAll('.post-content h2, .post-content h3')
      headings.forEach(h => observer.observe(h))
    }, 50)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [html])

  // 处理复制按钮点击 - 使用事件委托
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.code-copy') as HTMLButtonElement
      if (!btn) return
      
      const code = decodeURIComponent(btn.dataset.code || '')
      navigator.clipboard.writeText(code)
      
      btn.classList.add('copied')
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      
      setTimeout(() => {
        btn.classList.remove('copied')
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
      }, 2000)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (!post) {
    return (
      <div className="post-not-found">
        <div className="not-found-icon">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <h1>404</h1>
        <p>抱歉，您访问的文章不存在或已被删除</p>
        <Link to="/" className="back-home-btn">
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="post-layout">
      <div className="post-detail">
        <article className="post-article">
          <h1 className="post-title">{post.title}</h1>
          {config.features.showTags && post.tags.length > 0 && (
            <div className="post-meta">
              <div className="post-tags">
                {post.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div 
            className="post-content" 
            dangerouslySetInnerHTML={{ __html: html }} 
          />

          {/* 文章底部 */}
          <PostFooter slug={slug || ''} lastUpdated={post.date} />
        </article>
      </div>

      {config.features.showToc && toc.length > 0 && (
        <aside className="post-toc">
          <div className="toc-title">页面导航</div>
          <nav className="toc-nav">
            {toc.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`toc-link ${item.level === 3 ? 'toc-link-sub' : ''} ${activeId === item.id ? 'active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                {item.text}
              </a>
            ))}
          </nav>
          {showBackTop && (
            <button
              className="toc-back-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
              回到顶部
            </button>
          )}
        </aside>
      )}
    </div>
  )
}
