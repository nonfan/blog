import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateColorVariants,
  loadConfig,
  saveConfig,
  defaultConfig,
  normalizeBase,
  formatAssetPath,
  normalizeRepo,
} from './index'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('generateColorVariants', () => {
  it('应该生成正确的颜色变体', () => {
    const variants = generateColorVariants('#3b82f6')
    
    expect(variants.primary).toBe('#3b82f6')
    expect(variants.light).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    expect(variants.dark).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    expect(variants.alpha).toMatch(/^rgba\(\d+, \d+, \d+, 0\.4\)$/)
    expect(variants.alphaLight).toMatch(/^rgba\(\d+, \d+, \d+, 0\.4\)$/)
  })

  it('浅色版本应该比原色更亮', () => {
    const variants = generateColorVariants('#3b82f6')
    // 原色 rgb(59, 130, 246)
    // 浅色应该是 rgb(99, 170, 255) - 但会被限制在 255
    expect(variants.light).toBe('rgb(99, 170, 255)')
  })

  it('深色版本应该比原色更暗', () => {
    const variants = generateColorVariants('#3b82f6')
    // 原色 rgb(59, 130, 246)
    // 深色应该是 rgb(29, 100, 216)
    expect(variants.dark).toBe('rgb(29, 100, 216)')
  })

  it('应该处理边界值 - 接近白色', () => {
    const variants = generateColorVariants('#ffffff')
    // 浅色不能超过 255
    expect(variants.light).toBe('rgb(255, 255, 255)')
  })

  it('应该处理边界值 - 接近黑色', () => {
    const variants = generateColorVariants('#000000')
    // 深色不能低于 0
    expect(variants.dark).toBe('rgb(0, 0, 0)')
  })

  it('应该处理中间色值', () => {
    const variants = generateColorVariants('#808080')
    expect(variants.primary).toBe('#808080')
    expect(variants.light).toBe('rgb(168, 168, 168)')
    expect(variants.dark).toBe('rgb(98, 98, 98)')
  })
})

describe('loadConfig', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('没有保存的配置时应该返回默认配置', () => {
    localStorageMock.getItem.mockReturnValue(null)
    const config = loadConfig()
    
    expect(config.site.title).toBeDefined()
    expect(config.theme.primaryColor).toBeDefined()
    expect(config.features).toBeDefined()
  })

  it('应该加载保存的配置', () => {
    const savedConfig = {
      theme: { primaryColor: '#ff0000' },
      features: { showToc: false },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    expect(config.theme.primaryColor).toBe('#ff0000')
    expect(config.features.showToc).toBe(false)
  })

  it('应该合并保存的配置和默认配置', () => {
    const savedConfig = {
      theme: { primaryColor: '#ff0000' },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    // 保存的值
    expect(config.theme.primaryColor).toBe('#ff0000')
    // 默认值
    expect(config.features.showEditLink).toBeDefined()
  })

  it('应该处理无效的 JSON', () => {
    localStorageMock.getItem.mockReturnValue('invalid json')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const config = loadConfig()
    
    expect(config).toEqual(defaultConfig)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('应该保留 site 信息从默认配置', () => {
    const savedConfig = {
      site: { title: 'Custom Title' },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    // site 信息应该来自 defaultConfig（blog.config.ts）
    expect(config.site.title).toBe(defaultConfig.site.title)
  })

  it('应该处理 github repo 配置', () => {
    const savedConfig = {
      github: { repo: 'user/custom-repo' },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    expect(config.github.repo).toBe('user/custom-repo')
  })

  it('空的 github repo 应该使用默认值', () => {
    const savedConfig = {
      github: { repo: '' },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    expect(config.github.repo).toBe(defaultConfig.github.repo)
  })
})

describe('saveConfig', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该保存配置到 localStorage', () => {
    const config = { ...defaultConfig, theme: { primaryColor: '#ff0000' } }
    
    saveConfig(config)
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'blog-config',
      expect.any(String)
    )
  })

  it('保存的配置应该可以被正确解析', () => {
    const config = { ...defaultConfig, theme: { primaryColor: '#ff0000' } }
    
    saveConfig(config)
    
    const savedJson = localStorageMock.setItem.mock.calls[0][1]
    const parsed = JSON.parse(savedJson)
    expect(parsed.theme.primaryColor).toBe('#ff0000')
  })

  it('应该处理保存失败', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage full')
    })
    
    // 不应该抛出错误
    expect(() => saveConfig(defaultConfig)).not.toThrow()
    expect(consoleSpy).toHaveBeenCalled()
    
    consoleSpy.mockRestore()
    localStorageMock.setItem.mockRestore()
  })
})

describe('defaultConfig', () => {
  it('应该有完整的配置结构', () => {
    expect(defaultConfig.site).toBeDefined()
    expect(defaultConfig.theme).toBeDefined()
    expect(defaultConfig.features).toBeDefined()
    expect(defaultConfig.github).toBeDefined()
    expect(defaultConfig.footer).toBeDefined()
  })

  it('features 应该有所有必需的字段', () => {
    expect(typeof defaultConfig.features.showEditLink).toBe('boolean')
    expect(typeof defaultConfig.features.showLastUpdated).toBe('boolean')
    expect(typeof defaultConfig.features.showToc).toBe('boolean')
    expect(typeof defaultConfig.features.tocMaxLevel).toBe('number')
    expect(typeof defaultConfig.features.showTags).toBe('boolean')
    expect(typeof defaultConfig.features.showSplashOnce).toBe('boolean')
    expect(typeof defaultConfig.features.disableSplash).toBe('boolean')
    expect(typeof defaultConfig.features.showFooter).toBe('boolean')
    expect(typeof defaultConfig.features.showConfigButton).toBe('boolean')
    expect(typeof defaultConfig.features.showReadingProgress).toBe('boolean')
  })

  it('tocMaxLevel 应该在 2-6 范围内', () => {
    expect(defaultConfig.features.tocMaxLevel).toBeGreaterThanOrEqual(2)
    expect(defaultConfig.features.tocMaxLevel).toBeLessThanOrEqual(6)
  })

  it('theme.primaryColor 应该是有效的 hex 颜色', () => {
    expect(defaultConfig.theme.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('github 配置应该有默认值', () => {
    expect(defaultConfig.github.branch).toBeDefined()
    expect(defaultConfig.github.postsDir).toBeDefined()
  })

  it('footer 配置应该有版权年份', () => {
    expect(defaultConfig.footer.copyright).toBeDefined()
  })
})

describe('loadConfig 边界情况', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该处理部分 features 配置', () => {
    const savedConfig = {
      features: { showToc: false, showTags: false },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    expect(config.features.showToc).toBe(false)
    expect(config.features.showTags).toBe(false)
    // 其他 features 应该使用默认值
    expect(config.features.showEditLink).toBe(defaultConfig.features.showEditLink)
  })

  it('应该处理部分 footer 配置', () => {
    const savedConfig = {
      footer: { copyright: '2025' },
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig))
    
    const config = loadConfig()
    
    expect(config.footer.copyright).toBe('2025')
  })

  it('应该处理空对象配置', () => {
    localStorageMock.getItem.mockReturnValue('{}')
    
    const config = loadConfig()
    
    expect(config.site.title).toBe(defaultConfig.site.title)
    expect(config.theme.primaryColor).toBe(defaultConfig.theme.primaryColor)
  })
})

describe('normalizeBase', () => {
  it('空值应该返回空字符串', () => {
    expect(normalizeBase()).toBe('')
    expect(normalizeBase('')).toBe('')
    expect(normalizeBase(undefined)).toBe('')
  })

  it('根路径应该返回空字符串', () => {
    expect(normalizeBase('/')).toBe('')
  })

  it('应该确保以 / 开头', () => {
    expect(normalizeBase('blog')).toBe('/blog')
    expect(normalizeBase('/blog')).toBe('/blog')
  })

  it('应该移除结尾的 /', () => {
    expect(normalizeBase('/blog/')).toBe('/blog')
    expect(normalizeBase('blog/')).toBe('/blog')
  })

  it('应该处理多级路径', () => {
    expect(normalizeBase('/my/blog/')).toBe('/my/blog')
    expect(normalizeBase('my/blog')).toBe('/my/blog')
  })
})

describe('formatAssetPath', () => {
  it('空值应该返回 undefined', () => {
    expect(formatAssetPath()).toBeUndefined()
    expect(formatAssetPath('')).toBeUndefined()
    expect(formatAssetPath(undefined)).toBeUndefined()
  })

  it('http 链接应该原样返回', () => {
    expect(formatAssetPath('http://example.com/logo.png')).toBe('http://example.com/logo.png')
    expect(formatAssetPath('https://example.com/logo.png')).toBe('https://example.com/logo.png')
  })

  it('相对路径应该添加 /', () => {
    const result = formatAssetPath('assets/logo.png')
    expect(result).toContain('/assets/logo.png')
  })

  it('绝对路径应该保持 /', () => {
    const result = formatAssetPath('/assets/logo.png')
    expect(result).toContain('/assets/logo.png')
  })
})

describe('normalizeRepo', () => {
  it('空值应该返回空字符串', () => {
    expect(normalizeRepo()).toBe('')
    expect(normalizeRepo('')).toBe('')
    expect(normalizeRepo(undefined)).toBe('')
  })

  it('应该移除开头的 /', () => {
    expect(normalizeRepo('/user/repo')).toBe('user/repo')
    expect(normalizeRepo('//user/repo')).toBe('user/repo')
  })

  it('应该移除结尾的 /', () => {
    expect(normalizeRepo('user/repo/')).toBe('user/repo')
    expect(normalizeRepo('user/repo//')).toBe('user/repo')
  })

  it('应该同时移除开头和结尾的 /', () => {
    expect(normalizeRepo('/user/repo/')).toBe('user/repo')
  })

  it('正常路径应该保持不变', () => {
    expect(normalizeRepo('user/repo')).toBe('user/repo')
  })
})
