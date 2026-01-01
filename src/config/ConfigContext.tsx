import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  type BlogConfig,
  defaultConfig,
  loadConfig,
  saveConfig,
  generateColorVariants,
} from './index'

interface ConfigContextType {
  config: BlogConfig
  updateConfig: (updates: Partial<BlogConfig>) => void
  updateThemeColor: (color: string) => void
  updateFeature: (key: keyof BlogConfig['features'], value: boolean) => void
  updateReading: <K extends keyof BlogConfig['reading']>(key: K, value: BlogConfig['reading'][K]) => void
  resetConfig: () => void
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  updateThemeColor: () => {},
  updateFeature: () => {},
  updateReading: () => {},
  resetConfig: () => {},
})

export const useConfig = () => useContext(ConfigContext)

// 应用主题色到 CSS 变量
function applyThemeColor(color: string) {
  const variants = generateColorVariants(color)
  const root = document.documentElement
  root.style.setProperty('--color-primary', variants.primary)
  root.style.setProperty('--color-primary-light', variants.light)
  root.style.setProperty('--color-primary-dark', variants.dark)
  root.style.setProperty('--color-primary-alpha', variants.alpha)
  root.style.setProperty('--color-primary-alpha-light', variants.alphaLight)
}

// 应用阅读设置到 CSS 变量
function applyReadingSettings(reading: BlogConfig['reading']) {
  const root = document.documentElement
  
  // 字体大小
  const fontSizeMap = { small: '15px', medium: '17px', large: '19px' }
  root.style.setProperty('--font-size-base', fontSizeMap[reading.fontSize])
  
  // 字体类型
  const fontFamilyMap = {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  }
  root.style.setProperty('--font-family-content', fontFamilyMap[reading.fontFamily])
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BlogConfig>(defaultConfig)

  // 初始化加载配置
  useEffect(() => {
    const saved = loadConfig()
    setConfig(saved)
    applyThemeColor(saved.theme.primaryColor)
    applyReadingSettings(saved.reading)
  }, [])

  const updateConfig = (updates: Partial<BlogConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates }
      saveConfig(newConfig)
      return newConfig
    })
  }

  const updateThemeColor = (color: string) => {
    applyThemeColor(color)
    setConfig(prev => {
      const newConfig = {
        ...prev,
        theme: { ...prev.theme, primaryColor: color },
      }
      saveConfig(newConfig)
      return newConfig
    })
  }

  const updateFeature = (key: keyof BlogConfig['features'], value: boolean) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        features: { ...prev.features, [key]: value },
      }
      saveConfig(newConfig)
      return newConfig
    })
  }

  const updateReading = <K extends keyof BlogConfig['reading']>(key: K, value: BlogConfig['reading'][K]) => {
    setConfig(prev => {
      const newReading = { ...prev.reading, [key]: value }
      const newConfig = {
        ...prev,
        reading: newReading,
      }
      saveConfig(newConfig)
      applyReadingSettings(newReading as BlogConfig['reading'])
      return newConfig
    })
  }

  const resetConfig = () => {
    setConfig(defaultConfig)
    saveConfig(defaultConfig)
    applyThemeColor(defaultConfig.theme.primaryColor)
    applyReadingSettings(defaultConfig.reading)
  }

  return (
    <ConfigContext.Provider
      value={{ config, updateConfig, updateThemeColor, updateFeature, updateReading, resetConfig }}
    >
      {children}
    </ConfigContext.Provider>
  )
}
