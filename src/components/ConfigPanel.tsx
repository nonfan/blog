import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  { id: 'features', icon: 'toggle', label: '功能设置' },
  { id: 'reset', icon: 'refresh', label: '重置设置' },
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
    case 'toggle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="6" width="22" height="12" rx="6"/>
          <circle cx="17" cy="12" r="3" fill="currentColor"/>
        </svg>
      )
    case 'sparkle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>
      )
    case 'layout':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 15h18"/>
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
  const [activeMenu, setActiveMenu] = useState('theme')
  const [customColorInput, setCustomColorInput] = useState('')
  const [originPoint, setOriginPoint] = useState({ x: 0, y: 0 })
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { config, updateThemeColor, updateFeature, resetConfig } = useConfig()

  // 打开面板时记录按钮位置
  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // 计算按钮中心点相对于视口的位置
      setOriginPoint({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })
    }
    setIsOpen(true)
  }

  // 检查是否是预设颜色
  const isPresetColor = extendedColors.some(c => c.value === config.theme.primaryColor)

  // 初始化自定义颜色输入框：如果不是预设颜色，显示当前颜色值
  useEffect(() => {
    if (isPresetColor) {
      setCustomColorInput('')
    } else {
      // 移除 # 号并转大写
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
      
      case 'features':
        return (
          <div className="config-sidebar-content">
            {/* 布局卡片 */}
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

            {/* 开屏动画卡片 */}
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
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className="config-overlay" 
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            />
            
            <motion.div 
              className="config-sidebar-panel"
              style={{
                // 动态设置 transform-origin 为按钮位置
                transformOrigin: `${originPoint.x}px ${originPoint.y}px`
              }}
              initial={{ 
                opacity: 0, 
                scale: 0.3,
                borderRadius: '24px',
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                borderRadius: '0px',
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.3,
                borderRadius: '24px',
              }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 0.8,
                restDelta: 0.001,
              }}
            >
              {/* 左侧菜单 */}
              <div className="config-sidebar-left">
                {/* 用户信息 */}
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

                {/* 菜单列表 */}
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
                {/* 顶部标题 */}
                <div className="config-sidebar-header">
                  <div className="header-title">{activeMenu === 'theme' ? '主题/壁纸' : '功能设置'}</div>
                  <div className="header-subtitle">{activeMenu === 'theme' ? '深色模式、主题色' : '显示与动画设置'}</div>
                </div>
                
                {/* 内容区 */}
                <div className="config-sidebar-main">
                  {renderContent()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
