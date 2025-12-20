import { useState, useEffect } from 'react'
import { useConfig } from '../config/ConfigContext'
import './SplashScreen.css'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { config } = useConfig()
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const title = config.site.title || 'My Blog'

  useEffect(() => {
    // 模拟加载进度
    const duration = 2000 // 总时长 2 秒
    const interval = 30
    const step = 100 / (duration / interval)
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + step + Math.random() * 2
        if (next >= 100) {
          clearInterval(timer)
          // 进度完成后开始淡出
          setTimeout(() => {
            setFadeOut(true)
            setTimeout(onComplete, 500)
          }, 300)
          return 100
        }
        return next
      })
    }, interval)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      {/* 点阵背景 */}
      <div className="splash-dots" />
      
      {/* 主内容 */}
      <div className="splash-content">
        {/* 四角边框 */}
        <div className="splash-corners">
          <span className="corner top-left" />
          <span className="corner top-right" />
          <span className="corner bottom-left" />
          <span className="corner bottom-right" />
        </div>

        {/* Logo 和标题 */}
        <div className="splash-logo-wrapper">
          <div className="splash-logo">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="var(--color-primary)" fillOpacity="0.15"/>
              <path d="M8 10h16M8 16h12M8 22h8" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="splash-title">
            {title.split('').map((char, i) => (
              <span 
                key={i} 
                className="splash-char"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 底部进度 */}
      <div className="splash-progress">
        <span className="progress-text">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
