import { useEffect, useRef } from 'react'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'auto' | 'none'

interface SeasonEffectProps {
  season: Season
}

// 根据当前月份获取季节
function getCurrentSeason(): Exclude<Season, 'auto' | 'none'> {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export default function SeasonEffect({ season }: SeasonEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<Particle[]>([])
  
  const actualSeason = season === 'auto' ? getCurrentSeason() : season
  
  useEffect(() => {
    if (actualSeason === 'none') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 设置 canvas 尺寸
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    // 初始化粒子
    const particleCount = getParticleCount(actualSeason)
    particlesRef.current = Array.from({ length: particleCount }, () => 
      createParticle(actualSeason, canvas.width, canvas.height)
    )
    
    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particlesRef.current.forEach(particle => {
        updateParticle(particle, actualSeason, canvas.width, canvas.height)
        drawParticle(ctx, particle, actualSeason)
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [actualSeason])
  
  if (actualSeason === 'none') return null
  
  return (
    <canvas
      ref={canvasRef}
      className="season-effect-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  rotation: number
  rotationSpeed: number
  opacity: number
  color: string
  type: number // 用于区分不同形状
}

function getParticleCount(season: Exclude<Season, 'auto' | 'none'>): number {
  switch (season) {
    case 'spring': return 30
    case 'summer': return 150
    case 'autumn': return 25
    case 'winter': return 100
  }
}

function createParticle(
  season: Exclude<Season, 'auto' | 'none'>,
  width: number,
  height: number
): Particle {
  const base: Particle = {
    x: Math.random() * width,
    y: Math.random() * height - height,
    size: 0,
    speedX: 0,
    speedY: 0,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: 0,
    opacity: 1,
    color: '',
    type: 0,
  }
  
  switch (season) {
    case 'spring': // 樱花花瓣
      return {
        ...base,
        y: Math.random() * height * 0.5 - height * 0.5,
        size: 8 + Math.random() * 6,
        speedX: 0.3 + Math.random() * 0.5,
        speedY: 0.8 + Math.random() * 0.6,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.7 + Math.random() * 0.3,
        color: ['#ffb7c5', '#ffc0cb', '#ff69b4', '#ffb6c1'][Math.floor(Math.random() * 4)],
        type: Math.floor(Math.random() * 2),
      }
    
    case 'summer': // 雨滴
      return {
        ...base,
        size: 1 + Math.random() * 2,
        speedX: 1 + Math.random() * 0.5,
        speedY: 15 + Math.random() * 10,
        opacity: 0.3 + Math.random() * 0.3,
        color: '#87ceeb',
        type: 0,
      }
    
    case 'autumn': // 落叶
      return {
        ...base,
        y: Math.random() * height * 0.3 - height * 0.3,
        size: 12 + Math.random() * 8,
        speedX: 0.5 + Math.random() * 1,
        speedY: 0.8 + Math.random() * 0.8,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        opacity: 0.8 + Math.random() * 0.2,
        color: ['#d2691e', '#cd853f', '#daa520', '#b8860b', '#8b4513', '#a0522d'][Math.floor(Math.random() * 6)],
        type: Math.floor(Math.random() * 3),
      }
    
    case 'winter': // 雪花
      return {
        ...base,
        size: 2 + Math.random() * 4,
        speedX: (Math.random() - 0.5) * 1,
        speedY: 1 + Math.random() * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.6 + Math.random() * 0.4,
        color: '#ffffff',
        type: Math.floor(Math.random() * 2),
      }
  }
}

function updateParticle(
  particle: Particle,
  season: Exclude<Season, 'auto' | 'none'>,
  width: number,
  height: number
) {
  particle.x += particle.speedX
  particle.y += particle.speedY
  particle.rotation += particle.rotationSpeed
  
  // 添加一些摆动效果（除了雨）
  if (season !== 'summer') {
    particle.x += Math.sin(particle.y * 0.01) * 0.3
  }
  
  // 重置超出边界的粒子
  if (particle.y > height + 50 || particle.x > width + 50) {
    particle.y = -20
    particle.x = Math.random() * width
    if (season === 'spring' || season === 'autumn') {
      particle.x = Math.random() * width * 0.8
    }
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: Particle,
  season: Exclude<Season, 'auto' | 'none'>
) {
  ctx.save()
  ctx.translate(particle.x, particle.y)
  ctx.rotate(particle.rotation)
  ctx.globalAlpha = particle.opacity
  
  switch (season) {
    case 'spring':
      drawPetal(ctx, particle)
      break
    case 'summer':
      drawRaindrop(ctx, particle)
      break
    case 'autumn':
      drawLeaf(ctx, particle)
      break
    case 'winter':
      drawSnowflake(ctx, particle)
      break
  }
  
  ctx.restore()
}

// 绘制樱花花瓣
function drawPetal(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.fillStyle = particle.color
  ctx.beginPath()
  
  if (particle.type === 0) {
    // 椭圆形花瓣
    ctx.ellipse(0, 0, particle.size * 0.4, particle.size * 0.7, 0, 0, Math.PI * 2)
  } else {
    // 心形花瓣
    const s = particle.size * 0.3
    ctx.moveTo(0, -s)
    ctx.bezierCurveTo(s, -s * 2, s * 2, 0, 0, s)
    ctx.bezierCurveTo(-s * 2, 0, -s, -s * 2, 0, -s)
  }
  
  ctx.fill()
}

// 绘制雨滴
function drawRaindrop(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.strokeStyle = particle.color
  ctx.lineWidth = particle.size
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 15 + particle.size * 3)
  ctx.stroke()
}

// 绘制落叶
function drawLeaf(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.fillStyle = particle.color
  const s = particle.size * 0.5
  
  ctx.beginPath()
  if (particle.type === 0) {
    // 枫叶形状（简化）
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.5, -s * 0.3)
    ctx.lineTo(s, -s * 0.5)
    ctx.lineTo(s * 0.6, 0)
    ctx.lineTo(s * 0.8, s * 0.5)
    ctx.lineTo(s * 0.3, s * 0.3)
    ctx.lineTo(0, s)
    ctx.lineTo(-s * 0.3, s * 0.3)
    ctx.lineTo(-s * 0.8, s * 0.5)
    ctx.lineTo(-s * 0.6, 0)
    ctx.lineTo(-s, -s * 0.5)
    ctx.lineTo(-s * 0.5, -s * 0.3)
    ctx.closePath()
  } else if (particle.type === 1) {
    // 椭圆叶子
    ctx.ellipse(0, 0, s * 0.4, s * 0.8, 0, 0, Math.PI * 2)
  } else {
    // 橡树叶形状
    ctx.moveTo(0, -s)
    ctx.quadraticCurveTo(s * 0.8, -s * 0.5, s * 0.6, 0)
    ctx.quadraticCurveTo(s * 0.8, s * 0.3, s * 0.4, s * 0.6)
    ctx.quadraticCurveTo(s * 0.2, s * 0.8, 0, s)
    ctx.quadraticCurveTo(-s * 0.2, s * 0.8, -s * 0.4, s * 0.6)
    ctx.quadraticCurveTo(-s * 0.8, s * 0.3, -s * 0.6, 0)
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.5, 0, -s)
  }
  ctx.fill()
}

// 绘制雪花
function drawSnowflake(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.fillStyle = particle.color
  
  if (particle.type === 0) {
    // 圆形雪花
    ctx.beginPath()
    ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // 六角雪花
    ctx.strokeStyle = particle.color
    ctx.lineWidth = 1.5
    const s = particle.size
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.rotate((Math.PI / 3) * i)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -s)
      // 小分支
      ctx.moveTo(0, -s * 0.6)
      ctx.lineTo(s * 0.3, -s * 0.8)
      ctx.moveTo(0, -s * 0.6)
      ctx.lineTo(-s * 0.3, -s * 0.8)
      ctx.stroke()
      ctx.restore()
    }
  }
}

// 季节选择器组件
interface SeasonSelectorProps {
  value: Season
  onChange: (season: Season) => void
}

export function SeasonSelector({ value, onChange }: SeasonSelectorProps) {
  const seasons: { value: Season; label: string; icon: string }[] = [
    { value: 'none', label: '关闭', icon: '○' },
    { value: 'auto', label: '自动', icon: '◐' },
    { value: 'spring', label: '春', icon: '🌸' },
    { value: 'summer', label: '夏', icon: '🌧️' },
    { value: 'autumn', label: '秋', icon: '🍂' },
    { value: 'winter', label: '冬', icon: '❄️' },
  ]
  
  return (
    <div className="season-selector">
      {seasons.map(s => (
        <button
          key={s.value}
          className={`season-btn ${value === s.value ? 'active' : ''}`}
          onClick={() => onChange(s.value)}
          title={s.label}
        >
          <span className="season-icon">{s.icon}</span>
          <span className="season-label">{s.label}</span>
        </button>
      ))}
    </div>
  )
}
