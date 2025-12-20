import { useState, useRef, useEffect } from 'react'
import { useConfig } from '../config/ConfigContext'

// 扩展的预设颜色（类似图片中的布局）
const extendedColors = [
  // 第一行
  { name: '橙色', value: '#ff6b35' },
  { name: '黄色', value: '#ffb800' },
  { name: '薄荷', value: '#5dd9a5' },
  { name: '翠绿', value: '#00c853' },
  { name: '天蓝', value: '#7dd3fc' },
  { name: '蓝色', value: '#0ea5e9' },
  { name: '灰色', value: '#94a3b8' },
  // 第二行
  { name: '玫红', value: '#e91e63' },
  { name: '粉色', value: '#f48fb1' },
  { name: '紫色', value: '#9c27b0' },
]

export default function ConfigPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColorInput, setCustomColorInput] = useState('')
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const { config, updateThemeColor, updateFeature, updateConfig, resetConfig } = useConfig()

  // 检查是否是预设颜色
  const isPresetColor = extendedColors.some(c => c.value === config.theme.primaryColor)

  // 点击外部关闭取色器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  // 只有当颜色是自定义颜色（非预设）时，才在输入框显示
  // 当选择预设颜色时，清空输入框
  useEffect(() => {
    if (isPresetColor) {
      setCustomColorInput('')
    }
  }, [isPresetColor])

  // 处理自定义颜色输入
  const handleCustomColorChange = (value: string) => {
    // 只允许输入 hex 字符
    const cleaned = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 6)
    setCustomColorInput(cleaned)
    
    // 如果是有效的 6 位 hex，应用颜色
    if (cleaned.length === 6) {
      updateThemeColor(`#${cleaned}`)
    }
  }

  return (
    <>
      {/* 设置按钮 */}
      <button
        className="config-toggle-btn"
        onClick={() => setIsOpen(true)}
        aria-label="打开设置"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>

      {/* 配置面板 */}
      {isOpen && (
        <>
          <div className="config-overlay" onClick={() => setIsOpen(false)} />
          <div className="config-panel">
            <div className="config-header">
              <h3>设置</h3>
              <button className="config-close" onClick={() => setIsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="config-content">
              {/* 主题色 */}
              <div className="config-section">
                <div className="config-section-title">主题色</div>
                <div className="color-grid-wrapper" ref={colorPickerRef}>
                  <div className="color-grid">
                    {extendedColors.slice(0, 7).map(color => (
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
                  <div className="color-grid color-grid-row2">
                    {extendedColors.slice(7).map(color => (
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
                    {/* 自定义颜色输入 */}
                    <div className="custom-hex-input">
                      <span className="hex-prefix">#</span>
                      <input
                        type="text"
                        value={customColorInput}
                        onChange={e => handleCustomColorChange(e.target.value)}
                        placeholder="BA68C8"
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 功能开关 */}
              <div className="config-section">
                <div className="config-section-title">功能</div>
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
                    <span>开屏动画只显示一次</span>
                    <input
                      type="checkbox"
                      checked={config.features.showSplashOnce}
                      onChange={e => updateFeature('showSplashOnce', e.target.checked)}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              {/* GitHub 配置 */}
              <div className="config-section">
                <div className="config-section-title">GitHub</div>
                <div className="config-input-group">
                  <label>
                    <span>仓库地址</span>
                    <input
                      type="text"
                      placeholder="username/repo"
                      value={config.github.repo}
                      onChange={e =>
                        updateConfig({
                          github: { ...config.github, repo: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              {/* 重置 */}
              <div className="config-section">
                <button className="config-reset-btn" onClick={resetConfig}>
                  重置为默认设置
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
