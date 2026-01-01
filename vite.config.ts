import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import blogConfig from './blog.config'

// 标准化 base URL（Vite 需要以 / 结尾）
function normalizeBase(base?: string): string {
  if (!base || base === '/') return '/'
  let normalized = base
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (!normalized.endsWith('/')) normalized = `${normalized}/`
  return normalized
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // 开发模式使用根路径，生产构建使用配置的 baseUrl
  base: command === 'serve' ? '/' : normalizeBase(blogConfig.site?.baseUrl),
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
}))
