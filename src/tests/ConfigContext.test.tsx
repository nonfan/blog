import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ConfigProvider, useConfig } from '../config/ConfigContext'
import { defaultConfig } from '../config/index'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// 测试组件，用于访问 context
function TestComponent({ onConfig }: { onConfig?: (config: ReturnType<typeof useConfig>) => void }) {
  const configContext = useConfig()
  onConfig?.(configContext)
  return (
    <div>
      <span data-testid="title">{configContext.config.site.title}</span>
      <span data-testid="color">{configContext.config.theme.primaryColor}</span>
      <span data-testid="showToc">{String(configContext.config.features.showToc)}</span>
    </div>
  )
}

describe('ConfigContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    // 清除 CSS 变量
    document.documentElement.style.removeProperty('--color-primary')
  })

  describe('ConfigProvider', () => {
    it('应该提供默认配置', () => {
      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      )
      
      expect(screen.getByTestId('title')).toHaveTextContent(defaultConfig.site.title)
    })

    it('应该应用主题色到 CSS 变量', async () => {
      render(
        <ConfigProvider>
          <TestComponent />
        </ConfigProvider>
      )
      
      // 等待 useEffect 执行
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      const root = document.documentElement
      expect(root.style.getPropertyValue('--color-primary')).toBeTruthy()
    })
  })

  describe('useConfig', () => {
    it('应该返回配置对象', () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      expect(configContext).not.toBeNull()
      expect(configContext!.config).toBeDefined()
      expect(configContext!.updateConfig).toBeDefined()
      expect(configContext!.updateThemeColor).toBeDefined()
      expect(configContext!.updateFeature).toBeDefined()
      expect(configContext!.resetConfig).toBeDefined()
    })
  })

  describe('updateThemeColor', () => {
    it('应该更新主题色', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      await act(async () => {
        configContext!.updateThemeColor('#ff0000')
      })
      
      expect(screen.getByTestId('color')).toHaveTextContent('#ff0000')
    })

    it('应该保存到 localStorage', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      await act(async () => {
        configContext!.updateThemeColor('#ff0000')
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('应该更新 CSS 变量', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      await act(async () => {
        configContext!.updateThemeColor('#ff0000')
      })
      
      const root = document.documentElement
      expect(root.style.getPropertyValue('--color-primary')).toBe('#ff0000')
    })
  })

  describe('updateFeature', () => {
    it('应该更新功能开关', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      const initialValue = configContext!.config.features.showToc
      
      await act(async () => {
        configContext!.updateFeature('showToc', !initialValue)
      })
      
      expect(screen.getByTestId('showToc')).toHaveTextContent(String(!initialValue))
    })

    it('应该保存到 localStorage', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      await act(async () => {
        configContext!.updateFeature('showToc', false)
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('updateConfig', () => {
    it('应该更新配置', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      await act(async () => {
        configContext!.updateConfig({
          theme: { primaryColor: '#00ff00' }
        })
      })
      
      expect(screen.getByTestId('color')).toHaveTextContent('#00ff00')
    })
  })

  describe('resetConfig', () => {
    it('应该重置为默认配置', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      // 先修改配置
      await act(async () => {
        configContext!.updateThemeColor('#ff0000')
      })
      
      expect(screen.getByTestId('color')).toHaveTextContent('#ff0000')
      
      // 重置
      await act(async () => {
        configContext!.resetConfig()
      })
      
      expect(screen.getByTestId('color')).toHaveTextContent(defaultConfig.theme.primaryColor)
    })

    it('应该保存重置后的配置到 localStorage', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      localStorageMock.setItem.mockClear()
      
      await act(async () => {
        configContext!.resetConfig()
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('应该重置 CSS 变量', async () => {
      let configContext: ReturnType<typeof useConfig> | null = null
      
      render(
        <ConfigProvider>
          <TestComponent onConfig={(ctx) => { configContext = ctx }} />
        </ConfigProvider>
      )
      
      // 先修改
      await act(async () => {
        configContext!.updateThemeColor('#ff0000')
      })
      
      // 重置
      await act(async () => {
        configContext!.resetConfig()
      })
      
      const root = document.documentElement
      expect(root.style.getPropertyValue('--color-primary')).toBe(defaultConfig.theme.primaryColor)
    })
  })
})
