import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import { ConfigProvider, useConfig } from './config/ConfigContext'
import { baseUrl } from './config'
import ConfigPanel from './components/ConfigPanel'
import SplashScreen from './components/SplashScreen'
import Footer from './components/Footer'
import './App.css'

type Theme = 'system' | 'light' | 'dark'

interface MobileMenuContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toc: { id: string; text: string; level: number }[]
  setToc: (toc: { id: string; text: string; level: number }[]) => void
  activeId: string
  setActiveId: (id: string) => void
}

export const MobileMenuContext = createContext<MobileMenuContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toc: [],
  setToc: () => {},
  activeId: '',
  setActiveId: () => {},
})

export const useMobileMenu = () => useContext(MobileMenuContext)

// 检测是否为移动端
const isMobile = () => window.innerWidth <= 768

function AppContent() {
  const { config } = useConfig()
  const [showSplash, setShowSplash] = useState(() => {
    // 移动端禁用开屏效果
    if (isMobile()) {
      document.documentElement.classList.add('loaded')
      return false
    }
    // 直接从 localStorage 读取配置判断
    try {
      const saved = localStorage.getItem('blog-config')
      const savedConfig = saved ? JSON.parse(saved) : null
      
      // 永久关闭开屏动画
      if (savedConfig?.features?.disableSplash) {
        document.documentElement.classList.add('loaded')
        return false
      }
      
      const showOnce = savedConfig?.features?.showSplashOnce ?? false
      if (showOnce) {
        const shouldShow = !sessionStorage.getItem('splashShown')
        if (!shouldShow) {
          // 不显示 splash 时立即移除遮罩
          document.documentElement.classList.add('loaded')
        }
        return shouldShow
      }
    } catch {
      // ignore parse errors
    }
    return true
  })
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'system'
  })
  const [isDark, setIsDark] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([])
  const [activeId, setActiveId] = useState('')
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname === ''
  const isPostPage = location.pathname.startsWith('/post/')

  // 应用主题（不带动画）
  const applyTheme = (newTheme: Theme) => {
    let dark = false
    if (newTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      dark = mediaQuery.matches
    } else {
      dark = newTheme === 'dark'
    }
    setIsDark(dark)
    // 同步到 html 元素，供 splash screen 使用
    document.documentElement.classList.toggle('dark', dark)
  }

  // 带动画的主题切换
  const toggleThemeWithAnimation = (newTheme: Theme, event?: React.MouseEvent) => {
    // 计算切换后是否为深色
    let willBeDark = false
    if (newTheme === 'system') {
      willBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      willBeDark = newTheme === 'dark'
    }

    const isAppearanceTransition =
      // @ts-expect-error - startViewTransition is not yet in TypeScript types
      document.startViewTransition &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!isAppearanceTransition || !event) {
      setTheme(newTheme)
      return
    }

    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(async () => {
      setTheme(newTheme)
      // 等待 React 更新 DOM
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ]
      
      // 切换到深色：新视图从小到大扩散
      // 切换到浅色：旧视图从大到小收缩
      document.documentElement.animate(
        { clipPath: willBeDark ? clipPath : clipPath },
        {
          duration: 400,
          easing: 'ease-out',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })
  }

  useEffect(() => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])

  // 路由变化时关闭菜单
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleTocClick = (id: string) => {
    setMobileMenuOpen(false)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSplashComplete = () => {
    setShowSplash(false)
    if (config.features.showSplashOnce) {
      sessionStorage.setItem('splashShown', 'true')
    }
  }

  return (
    <MobileMenuContext.Provider value={{ isOpen: mobileMenuOpen, setIsOpen: setMobileMenuOpen, toc, setToc, activeId, setActiveId }}>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div className={`app ${isDark ? 'dark' : ''}`}>
        <header className="header">
          <Link to="/" className="logo">
            {config.site.logo ? (
              <img src={config.site.logo} alt="logo" className="logo-img" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.1"/>
                <path d="M8 10h16M8 16h12M8 22h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
            <span className="logo-text">{config.site.title}</span>
          </Link>

          {isHome && (
            <div className="header-search">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="搜索文章..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* 桌面端主题切换 */}
          <div className="theme-switcher desktop-only">
            <button 
              className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={(e) => toggleThemeWithAnimation('system', e)}
              aria-label="跟随系统"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={(e) => toggleThemeWithAnimation('light', e)}
              aria-label="亮色模式"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={(e) => toggleThemeWithAnimation('dark', e)}
              aria-label="暗色模式"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </div>

          {/* 移动端右侧按钮组 */}
          <div className="header-actions mobile-only">
            {/* 主题切换按钮 - 点击循环切换 */}
            <button 
              className="theme-toggle-btn"
              onClick={(e) => {
                const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
                toggleThemeWithAnimation(next, e)
              }}
              aria-label="切换主题"
            >
              {theme === 'system' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              ) : theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* 菜单按钮 */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="菜单"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12"/>
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18"/>
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* 移动端侧边栏 - 仅显示目录 */}
        {isPostPage && toc.length > 0 && (
          <div className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-sidebar-content">
              <div className="mobile-section">
                <div className="mobile-section-title">页面导航</div>
                <nav className="mobile-toc">
                  {toc.map(item => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`mobile-toc-link ${item.level === 3 ? 'sub' : ''} ${activeId === item.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        handleTocClick(item.id)
                      }}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* 遮罩层 */}
        {mobileMenuOpen && (
          <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
        )}

        <Routes>
          <Route path="/" element={<Home searchQuery={searchQuery} />} />
          <Route path="/post/:slug" element={<PostDetail />} />
        </Routes>

        {/* 页脚 - 仅首页显示 */}
        {isHome && <Footer />}

        {/* 右下角浮动按钮 */}
        <div className="floating-buttons">
          <ConfigPanel />
        </div>
      </div>
    </MobileMenuContext.Provider>
  )
}

function App() {
  return (
    <BrowserRouter basename={baseUrl || '/'}>
      <ConfigProvider>
        <AppContent />
      </ConfigProvider>
    </BrowserRouter>
  )
}

export default App
