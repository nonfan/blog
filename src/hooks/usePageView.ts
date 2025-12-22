import { useState, useEffect } from 'react'

interface ViewData {
  [key: string]: number
}

// 单个页面浏览量 Hook（用于文章详情页，使用不蒜子）
export function usePageView(slug: string, enabled: boolean = true) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled || !slug) return

    // 加载不蒜子脚本
    const script = document.createElement('script')
    script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
    script.async = true
    document.body.appendChild(script)

    // 监听不蒜子数据更新
    const checkCount = setInterval(() => {
      const el = document.getElementById('busuanzi_value_page_pv')
      if (el && el.textContent) {
        setCount(parseInt(el.textContent, 10) || 0)
        clearInterval(checkCount)
      }
    }, 100)

    // 5秒后停止检查
    const timeout = setTimeout(() => clearInterval(checkCount), 5000)

    return () => {
      clearInterval(checkCount)
      clearTimeout(timeout)
      if (script.parentNode) {
        document.body.removeChild(script)
      }
    }
  }, [slug, enabled])

  return count
}

// 批量获取浏览量 Hook（用于首页卡片，使用本地存储）
export function useViewCounts(slugs: string[], enabled: boolean = true) {
  const [counts, setCounts] = useState<ViewData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled || slugs.length === 0) {
      setLoading(false)
      return
    }

    setCounts(getAllLocalViewCounts())
    setLoading(false)
  }, [slugs, enabled])

  return { counts, loading }
}

// 增加浏览量（在文章详情页调用）
export function incrementViewCount(slug: string) {
  const stored = localStorage.getItem('page-views')
  const data: ViewData = stored ? JSON.parse(stored) : {}
  data[slug] = (data[slug] || 0) + 1
  localStorage.setItem('page-views', JSON.stringify(data))
  return data[slug]
}

// 获取本地存储的浏览量
export function getLocalViewCount(slug: string): number {
  const stored = localStorage.getItem('page-views')
  if (!stored) return 0
  try {
    const data = JSON.parse(stored)
    return data[slug] || 0
  } catch {
    return 0
  }
}

// 获取所有本地浏览量
export function getAllLocalViewCounts(): ViewData {
  const stored = localStorage.getItem('page-views')
  if (!stored) return {}
  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}
