// 博客全局配置
import blogConfig from '../../blog.config'

export interface BlogConfig {
  // 站点信息
  site: {
    title: string
    description?: string
    author?: string
    logo?: string
  }

  // 主题色配置
  theme: {
    primaryColor: string // 主题色 hex
  }

  // 功能开关
  features: {
    showEditLink: boolean // 显示 GitHub 编辑链接
    showLastUpdated: boolean // 显示最后更新时间
    showToc: boolean // 显示目录
    showTags: boolean // 显示标签
    showSplashOnce: boolean // 开屏动画只显示一次
  }

  // GitHub 配置
  github: {
    repo: string // 仓库地址，如 'username/repo'
    branch: string // 分支名
    postsDir: string // 文章目录
  }
}

// 标准化 base URL（确保以 / 开头，不以 / 结尾，根目录为空字符串）
function normalizeBase(base?: string): string {
  if (!base || base === '/') return ''
  let normalized = base
  // 确保以 / 开头
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  // 移除结尾的 /
  if (normalized.endsWith('/')) normalized = normalized.slice(0, -1)
  return normalized
}

// 获取标准化后的 base URL
export const baseUrl = normalizeBase(blogConfig.site?.baseUrl)

// 处理资源路径，自动拼接 baseUrl
function formatAssetPath(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http')) return path
  // 确保路径以 / 开头
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

// 标准化 GitHub repo 路径（移除开头和结尾的 /）
function normalizeRepo(repo?: string): string {
  if (!repo) return ''
  return repo.replace(/^\/+|\/+$/g, '')
}

// 从 blog.config.ts 读取默认配置
export const defaultConfig: BlogConfig = {
  site: {
    title: blogConfig.site?.title || 'Blog',
    description: blogConfig.site?.description,
    author: blogConfig.site?.author,
    logo: formatAssetPath(blogConfig.site?.logo),
  },
  theme: {
    primaryColor: blogConfig.theme?.primaryColor || '#3b82f6',
  },
  features: {
    showEditLink: blogConfig.features?.showEditLink ?? true,
    showLastUpdated: blogConfig.features?.showLastUpdated ?? true,
    showToc: blogConfig.features?.showToc ?? true,
    showTags: blogConfig.features?.showTags ?? true,
    showSplashOnce: blogConfig.features?.showSplashOnce ?? false,
  },
  github: {
    repo: normalizeRepo(blogConfig.github?.repo),
    branch: blogConfig.github?.branch || 'main',
    postsDir: blogConfig.github?.postsDir || 'posts',
  },
}

// 预设主题色
export const themeColors = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '粉色', value: '#ec4899' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '绿色', value: '#22c55e' },
  { name: '青色', value: '#06b6d4' },
]

// 根据主色生成浅色和深色变体
export function generateColorVariants(hex: string) {
  // 转换 hex 到 rgb
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // 浅色版本（用于深色模式）
  const light = `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`

  // 深色版本（用于 hover）
  const dark = `rgb(${Math.max(r - 30, 0)}, ${Math.max(g - 30, 0)}, ${Math.max(b - 30, 0)})`

  // 半透明版本
  const alpha = `rgba(${r}, ${g}, ${b}, 0.4)`
  const alphaLight = `rgba(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)}, 0.4)`

  return { primary: hex, light, dark, alpha, alphaLight }
}

// localStorage key
const CONFIG_KEY = 'blog-config'

// 从 localStorage 加载配置
export function loadConfig(): BlogConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 深度合并，保留 defaultConfig 中的 site 信息（logo 等不应被覆盖）
      return {
        ...defaultConfig,
        ...parsed,
        site: {
          ...defaultConfig.site,
          ...parsed.site,
          // logo 始终使用默认配置（从 blog.config.ts 读取）
          logo: defaultConfig.site.logo,
        },
        github: {
          ...defaultConfig.github,
          ...parsed.github,
        },
      }
    }
  } catch (e) {
    console.error('Failed to load config:', e)
  }
  return defaultConfig
}

// 保存配置到 localStorage
export function saveConfig(config: BlogConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Failed to save config:', e)
  }
}
