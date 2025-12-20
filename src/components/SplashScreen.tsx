import { useRef, useEffect } from 'react'
import { useConfig } from '../config/ConfigContext'
import gsap from 'gsap'
import './SplashScreen.css'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { config } = useConfig()
  const containerRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const cornersRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const topClipRef = useRef<HTMLDivElement>(null)
  const bottomClipRef = useRef<HTMLDivElement>(null)
  const title = config.site.title || 'My Blog'

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // 动画开始后再移除初始遮罩
      tl.call(
        () => {
          document.documentElement.classList.add('loaded')
        },
        [],
        0.1
      )

      // 计算标题宽度的一半，用于 Logo 初始偏移
      const titleWidth = titleRef.current?.offsetWidth || 0
      const logoOffset = (titleWidth + 18) / 2

      // 设置 Logo 初始位置（居中）
      gsap.set(logoRef.current, { x: logoOffset })

      // 进度数字动画 - 到整体离开时到达100
      const progressObj = { value: 0 }
      gsap.to(progressObj, {
        value: 100,
        duration: 2.4,
        ease: 'power1.inOut',
        onUpdate: () => {
          if (numberRef.current) {
            numberRef.current.textContent = Math.round(progressObj.value).toString()
          }
        },
      })

      // 1. Logo 模糊浮现
      tl.to(
        logoRef.current,
        {
          opacity: 1,
          filter: 'blur(0px)',
          scale: 1,
          duration: 0.6,
          ease: 'power2.out',
        },
        0.2
      )

      // 进度显示
      tl.to(
        progressRef.current,
        {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
        0.3
      )

      // 2. Logo 左移
      tl.to(
        logoRef.current,
        {
          x: 0,
          duration: 0.4,
          ease: 'power2.inOut',
        },
        0.9
      )

      // 标题整体从下到上出现
      tl.to(
        titleRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
        },
        1.35
      )

      // 四角边框显示
      const corners = cornersRef.current?.querySelectorAll('.corner') || []
      tl.to(
        corners,
        {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
        1.4
      )

      // 3. 退出动画：上下遮罩向中心闭合，挤压内容
      const contentHeight = cornersRef.current?.offsetHeight || 0
      const clipHeight = contentHeight / 2

      // 上遮罩从上往下展开
      tl.to(
        topClipRef.current,
        {
          height: clipHeight,
          duration: 0.45,
          ease: 'power2.inOut',
        },
        2.0
      )

      // 下遮罩从下往上展开
      tl.to(
        bottomClipRef.current,
        {
          height: clipHeight,
          duration: 0.45,
          ease: 'power2.inOut',
        },
        2.0
      )

      // 上面两个角向下移动
      tl.to(
        '.corner.tl, .corner.tr',
        {
          y: clipHeight,
          duration: 0.45,
          ease: 'power2.inOut',
        },
        2.0
      )

      // 下面两个角向上移动
      tl.to(
        '.corner.bl, .corner.br',
        {
          y: -clipHeight,
          duration: 0.45,
          ease: 'power2.inOut',
        },
        2.0
      )

      // 进度淡出
      tl.to(
        progressRef.current,
        {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.out',
        },
        2.0
      )

      // 4. 闭合后整体向上离开
      tl.to(
        containerRef.current,
        {
          yPercent: -100,
          duration: 0.5,
          ease: 'power3.inOut',
        },
        2.5
      )

      // 完成后触发回调
      tl.call(onComplete, [], 3.0)
    }, containerRef)

    return () => ctx.revert()
  }, [onComplete])

  return (
    <div ref={containerRef} className="splash-screen">
      <div className="splash-dots" />
      <div className="splash-mask" />

      <div className="splash-content">
        <div ref={cornersRef} className="splash-corners">
          <svg className="corner tl" width="20" height="20" viewBox="0 0 20 20">
            <path d="M0 20V0H20" fill="none" stroke="currentColor" strokeWidth="4"/>
          </svg>
          <svg className="corner tr" width="20" height="20" viewBox="0 0 20 20">
            <path d="M20 20V0H0" fill="none" stroke="currentColor" strokeWidth="4"/>
          </svg>
          <svg className="corner bl" width="20" height="20" viewBox="0 0 20 20">
            <path d="M0 0V20H20" fill="none" stroke="currentColor" strokeWidth="4"/>
          </svg>
          <svg className="corner br" width="20" height="20" viewBox="0 0 20 20">
            <path d="M20 0V20H0" fill="none" stroke="currentColor" strokeWidth="4"/>
          </svg>
          
          {/* 上下遮罩层 - 用于挤压效果 */}
          <div ref={topClipRef} className="splash-clip splash-clip-top" />
          <div ref={bottomClipRef} className="splash-clip splash-clip-bottom" />
        </div>

        <div className="splash-brand">
          <div ref={logoRef} className="splash-logo">
            {config.site.logo ? (
              <img src={config.site.logo} alt="" />
            ) : (
              <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="var(--color-primary)" fillOpacity="0.12"/>
                <path d="M8 10h16M8 16h12M8 22h8" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <div ref={titleRef} className="splash-title">
            {title.split('').map((char, i) => (
              <span key={i} className="char">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div ref={progressRef} className="splash-progress">
        <span ref={numberRef} className="progress-number">0</span>
        <span className="progress-percent">%</span>
      </div>
    </div>
  )
}
