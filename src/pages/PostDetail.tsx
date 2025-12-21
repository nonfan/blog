import { useParams, Link } from 'react-router-dom'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { getPostBySlug } from '../utils/posts'
import { useMobileMenu } from '../App'
import { useConfig } from '../config/ConfigContext'
import { baseUrl } from '../config'
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
  const tocNavRef = useRef<HTMLElement>(null)

  // 导出 PDF - 使用浏览器打印
  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  // 监听滚动显示回到顶部
  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 获取预渲染的 HTML，并处理图片路径
  const html = useMemo(() => {
    const rawHtml = slug ? htmlModules[`/src/generated/html/${slug}.html`] || '' : ''
    if (!baseUrl) return rawHtml
    // 给相对路径的图片添加 baseUrl
    return rawHtml.replace(
      /(<img[^>]+src=["'])\/(?!\/)/g,
      `$1${baseUrl}/`
    )
  }, [slug])

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

  // 当 activeId 变化时，滚动目录使当前项可见，并更新指示器位置
  useEffect(() => {
    if (!activeId || !tocNavRef.current) return
    const activeLink = tocNavRef.current.querySelector(`a[href="#${CSS.escape(activeId)}"]`) as HTMLElement
    const indicator = tocNavRef.current.querySelector('.toc-indicator') as HTMLElement
    
    if (activeLink && indicator) {
      // 滚动到可见区域
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      
      // 更新指示器位置
      const navRect = tocNavRef.current.getBoundingClientRect()
      const linkRect = activeLink.getBoundingClientRect()
      const top = linkRect.top - navRect.top + tocNavRef.current.scrollTop
      
      indicator.style.top = `${top}px`
      indicator.style.height = `${linkRect.height}px`
      indicator.style.opacity = '1'
    }
  }, [activeId])

  // 设置页面标题
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | ${config.site.title}`
    }
    return () => {
      document.title = config.site.title
    }
  }, [post, config.site.title])

  // 监听滚动，更新当前活动的标题（参考 VitePress 实现）
  useEffect(() => {
    let headings: { id: string; top: number }[] = []
    
    const getHeadingsTop = () => {
      headings = Array.from(
        document.querySelectorAll('.post-content h2, .post-content h3')
      ).map(h => ({
        id: h.id,
        top: (h as HTMLElement).offsetTop
      }))
    }

    const updateActiveHeading = () => {
      if (headings.length === 0) return

      const scrollY = window.scrollY
      const innerHeight = window.innerHeight
      const offsetHeight = document.body.offsetHeight
      const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 1

      // 如果滚动到底部，激活最后一个标题
      if (isBottom) {
        setActiveId(headings[headings.length - 1].id)
        return
      }

      // 找到当前滚动位置对应的标题
      const offset = 100
      for (let i = headings.length - 1; i >= 0; i--) {
        if (scrollY >= headings[i].top - offset) {
          setActiveId(headings[i].id)
          return
        }
      }

      // 默认激活第一个
      if (headings.length > 0) {
        setActiveId(headings[0].id)
      }
    }

    const onScroll = () => {
      updateActiveHeading()
    }

    const timer = setTimeout(() => {
      getHeadingsTop()
      updateActiveHeading()
      window.addEventListener('scroll', onScroll, { passive: true })
    }, 100)

    // 窗口大小变化时重新计算标题位置
    const onResize = () => {
      getHeadingsTop()
      updateActiveHeading()
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [html, setActiveId])

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
          <div className="post-header">
            <h1 className="post-title">{post.title}</h1>
            <button 
              className="export-pdf-btn"
              onClick={handleExportPDF} 
              title="导出 PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
              PDF
            </button>
          </div>
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
          <PostFooter slug={slug || ''} lastUpdated={post.date} tags={post.tags} />
        </article>
      </div>

      {config.features.showToc && toc.length > 0 && (
        <aside className="post-toc">
          <div className="toc-title">页面导航</div>
          <nav className="toc-nav" ref={tocNavRef}>
            <div className="toc-indicator" />
            {toc.map((item, index) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-index={index}
                className={`toc-link ${item.level === 3 ? 'toc-link-sub' : ''} ${activeId === item.id ? 'active' : ''}`}
                onClick={() => setActiveId(item.id)}
              >
                {item.text}
              </a>
            ))}
          </nav>
          <div className="toc-back-top-wrapper">
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
          </div>
        </aside>
      )}
    </div>
  )
}
