import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { useConfig } from '../config/ConfigContext'
import './ConfigPanel.css'

// 扩展的预设颜色（类似图片中的布局）
const extendedColors = [
  { name: '蓝色', value: '#0ea5e9' },
  { name: '黄色', value: '#ffb800' },
  { name: '橙色', value: '#ff6b35' },
  { name: '红色', value: '#ef4444' },
  { name: '翠绿', value: '#00c853' },
  { name: '天蓝', value: '#7dd3fc' },
  { name: '粉色', value: '#f48fb1' },
  { name: '黄绿', value: '#a3e635' },
  { name: '紫色', value: '#a855f7' },
]

// 菜单项配置
const menuItems = [
  { id: 'theme', icon: 'palette', label: '主题/壁纸' },
  { id: 'reading', icon: 'text', label: '阅读设置' },
  { id: 'features', icon: 'toggle', label: '功能设置' },
  { id: 'reset', icon: 'refresh', label: '重置设置' },
]

// 字体大小选项
const fontSizeOptions: { value: 'small' | 'medium' | 'large'; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

// 字体类型选项
const fontFamilyOptions: { value: 'sans' | 'serif' | 'mono'; label: string }[] = [
  { value: 'sans', label: '无衬线' },
  { value: 'serif', label: '衬线' },
  { value: 'mono', label: '等宽' },
]

// 图标组件
function MenuIcon({ name }: { name: string }) {
  switch (name) {
    case 'palette':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.14-.77-.38-1.06-.25-.3-.38-.68-.38-1.06 0-.93.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.5-9-10-9z"/>
          <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="7.5" r="1.5" fill="currentColor"/>
          <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor"/>
        </svg>
      )
    case 'text':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 7V4h16v3"/>
          <path d="M9 20h6"/>
          <path d="M12 4v16"/>
        </svg>
      )
    case 'toggle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="6" width="22" height="12" rx="6"/>
          <circle cx="17" cy="12" r="3" fill="currentColor"/>
        </svg>
      )
    case 'refresh':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      )
    default:
      return null
  }
}


export default function ConfigPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeMenu, setActiveMenu] = useState('theme')
  const [customColorInput, setCustomColorInput] = useState('')
  
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  
  const { config, updateThemeColor, updateFeature, updateReading, resetConfig } = useConfig()

  // 检查是否是预设颜色
  const isPresetColor = extendedColors.some(c => c.value === config.theme.primaryColor)

  // 初始化自定义颜色输入框
  useEffect(() => {
    if (isPresetColor) {
      setCustomColorInput('')
    } else {
      setCustomColorInput(config.theme.primaryColor.replace('#', '').toUpperCase())
    }
  }, [isPresetColor, config.theme.primaryColor])

  // 打开设置面板时添加 body 类
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('config-open')
    } else {
      document.body.classList.remove('config-open')
    }
    return () => document.body.classList.remove('config-open')
  }, [isOpen])

  // 打开动画 - 从右侧滑入
  const animateOpen = useCallback(() => {
    if (!panelRef.current || !overlayRef.current) return

    const tl = gsap.timeline()
    
    // 遮罩层淡入
    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { 
        opacity: 1, 
        duration: 0.35,
        ease: 'power2.out'
      }
    )
    
    // 面板从右侧滑入 - macOS 风格
    tl.fromTo(panelRef.current,
      { 
        x: '100%',
        opacity: 0.8,
      },
      { 
        x: '0%',
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
      },
      '-=0.3'
    )

    timelineRef.current = tl
  }, [])

  // 关闭动画 - 滑出到右侧
  const animateClose = useCallback(() => {
    if (!panelRef.current || !overlayRef.current) return

    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false)
        setIsOpen(false)
      }
    })

    // 面板滑出
    tl.to(panelRef.current, {
      x: '100%',
      opacity: 0.8,
      duration: 0.35,
      ease: 'power3.in',
    })

    // 遮罩层淡出
    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in'
    }, '-=0.25')

    timelineRef.current = tl
  }, [])

  // 打开面板
  const handleOpen = () => {
    setIsOpen(true)
    setIsVisible(true)
  }

  // 当面板可见时执行打开动画
  useEffect(() => {
    if (isVisible && isOpen) {
      // 等待 DOM 渲染
      requestAnimationFrame(() => {
        animateOpen()
      })
    }
  }, [isVisible, isOpen, animateOpen])

  // 关闭面板
  const handleClose = () => {
    animateClose()
  }

  // 处理自定义颜色输入
  const handleCustomColorChange = (value: string) => {
    const cleaned = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 6)
    setCustomColorInput(cleaned)
    if (cleaned.length === 6) {
      updateThemeColor(`#${cleaned}`)
    }
  }

  // 处理菜单点击
  const handleMenuClick = (id: string) => {
    if (id === 'reset') {
      resetConfig()
    } else {
      setActiveMenu(id)
    }
  }


  // 渲染内容区域
  const renderContent = () => {
    switch (activeMenu) {
      case 'theme':
        return (
          <div className="config-sidebar-content">
            <div className="config-sidebar-card">
              <div className="config-sidebar-section">
                <div className="config-sidebar-section-title">主题色</div>
                <div className="color-grid-wrapper" ref={colorPickerRef}>
                  <div className="color-grid">
                    {extendedColors.map(color => (
                      <button
                        key={color.value}
                        className={`color-grid-item ${config.theme.primaryColor === color.value ? 'active' : ''}`}
                        style={{ background: color.value }}
                        onClick={() => {
                          updateThemeColor(color.value)
                          setCustomColorInput('')
                        }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="config-sidebar-section">
                <div className="config-sidebar-section-title">自定义颜色</div>
                <div className="custom-hex-input">
                  <span className="hex-prefix">#</span>
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={e => handleCustomColorChange(e.target.value)}
                    placeholder="输入色值，如 BA68C8"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'reading':
        return (
          <div className="config-sidebar-content">
            <div className="config-sidebar-card">
              <div className="config-sidebar-section">
                <div className="config-sidebar-section-title">字体大小</div>
                <div className="config-option-group">
                  {fontSizeOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`config-option-btn ${config.reading.fontSize === opt.value ? 'active' : ''}`}
                      onClick={() => updateReading('fontSize', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="config-sidebar-section">
                <div className="config-sidebar-section-title">字体类型</div>
                <div className="config-option-group">
                  {fontFamilyOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`config-option-btn ${config.reading.fontFamily === opt.value ? 'active' : ''}`}
                      onClick={() => updateReading('fontFamily', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'features':
        return (
          <div className="config-sidebar-content">
            <div className="config-sidebar-card">
              <div className="config-sidebar-section-title">布局</div>
              <div className="config-switches">
                <label className={`config-switch ${!config.github.repo ? 'disabled' : ''}`}>
                  <span>显示编辑链接</span>
                  <input
                    type="checkbox"
                    checked={config.features.showEditLink && !!config.github.repo}
                    onChange={e => updateFeature('showEditLink', e.target.checked)}
                    disabled={!config.github.repo}
                  />
                  <span className="switch-slider" />
                </label>
                <label className="config-switch">
                  <span>显示更新时间</span>
                  <input
                    type="checkbox"
                    checked={config.features.showLastUpdated}
                    onChange={e => updateFeature('showLastUpdated', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
                <label className="config-switch">
                  <span>显示目录</span>
                  <input
                    type="checkbox"
                    checked={config.features.showToc}
                    onChange={e => updateFeature('showToc', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
                <label className="config-switch">
                  <span>显示标签</span>
                  <input
                    type="checkbox"
                    checked={config.features.showTags}
                    onChange={e => updateFeature('showTags', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
                <label className="config-switch">
                  <span>阅读进度条</span>
                  <input
                    type="checkbox"
                    checked={config.features.showReadingProgress}
                    onChange={e => updateFeature('showReadingProgress', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
                <label className="config-switch">
                  <span>显示页脚</span>
                  <input
                    type="checkbox"
                    checked={config.features.showFooter}
                    onChange={e => updateFeature('showFooter', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>

            <div className="config-sidebar-card">
              <div className="config-sidebar-section-title">开屏动画</div>
              <div className="config-switches">
                <label className={`config-switch ${config.features.disableSplash ? 'disabled' : ''}`}>
                  <span>仅首次加载显示</span>
                  <input
                    type="checkbox"
                    checked={config.features.showSplashOnce}
                    onChange={e => updateFeature('showSplashOnce', e.target.checked)}
                    disabled={config.features.disableSplash}
                  />
                  <span className="switch-slider" />
                </label>
                <label className="config-switch">
                  <span>永久关闭动画</span>
                  <input
                    type="checkbox"
                    checked={config.features.disableSplash}
                    onChange={e => updateFeature('disableSplash', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }


  return (
    <>
      {/* 设置按钮 */}
      <button
        ref={buttonRef}
        className="config-toggle-btn"
        onClick={handleOpen}
        aria-label="打开设置"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* 侧边设置面板 */}
      {isVisible && (
        <>
          <div 
            ref={overlayRef}
            className="config-overlay" 
            onClick={handleClose}
            style={{ opacity: 0 }}
          />
          
          <div 
            ref={panelRef}
            className="config-sidebar-panel"
            style={{ opacity: 0.8, transform: 'translateX(100%)' }}
          >
            {/* 左侧菜单 */}
            <div className="config-sidebar-left">
              <div className="config-sidebar-user">
                <div className="user-avatar">
                  {config.site.logo ? (
                    <img src={config.site.logo} alt="avatar" />
                  ) : (
                    <img src="/logo.svg" alt="avatar" />
                  )}
                </div>
                <span className="user-name">{config.site.title || 'Blog'}</span>
              </div>

              <nav className="config-sidebar-nav">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    className={`config-sidebar-nav-item ${activeMenu === item.id ? 'active' : ''} ${item.id === 'reset' ? 'reset-item' : ''}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <MenuIcon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* 右侧区域 */}
            <div className="config-sidebar-right">
              <div className="config-sidebar-header">
                <div className="header-title">
                  {activeMenu === 'theme' ? '主题/壁纸' : activeMenu === 'reading' ? '阅读设置' : '功能设置'}
                </div>
                <div className="header-subtitle">
                  {activeMenu === 'theme' ? '深色模式、主题色' : activeMenu === 'reading' ? '字体、代码主题、布局' : '显示与动画设置'}
                </div>
              </div>
              
              <div className="config-sidebar-main">
                {renderContent()}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
