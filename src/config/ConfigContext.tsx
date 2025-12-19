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
  resetConfig: () => void
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  updateThemeColor: () => {},
  updateFeature: () => {},
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

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BlogConfig>(defaultConfig)

  // 初始化加载配置
  useEffect(() => {
    const saved = loadConfig()
    setConfig(saved)
    applyThemeColor(saved.theme.primaryColor)
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

  const resetConfig = () => {
    setConfig(defaultConfig)
    saveConfig(defaultConfig)
    applyThemeColor(defaultConfig.theme.primaryColor)
  }

  return (
    <ConfigContext.Provider
      value={{ config, updateConfig, updateThemeColor, updateFeature, resetConfig }}
    >
      {children}
    </ConfigContext.Provider>
  )
}
