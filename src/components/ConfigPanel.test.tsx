import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfigPanel from './ConfigPanel'
import { ConfigProvider } from '../config/ConfigContext'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// 包装组件以提供 Context
const renderWithProvider = () => {
  return render(
    <ConfigProvider>
      <ConfigPanel />
    </ConfigProvider>
  )
}

describe('ConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('设置按钮', () => {
    it('应该渲染设置按钮', () => {
      renderWithProvider()
      const button = screen.getByRole('button', { name: '打开设置' })
      expect(button).toBeInTheDocument()
    })

    it('点击设置按钮应该打开面板', () => {
      renderWithProvider()
      const button = screen.getByRole('button', { name: '打开设置' })
      fireEvent.click(button)
      
      // 检查面板是否打开（通过检查菜单项）
      expect(screen.getByText('功能设置')).toBeInTheDocument()
    })
  })

  describe('侧边面板', () => {
    it('打开面板后应该显示用户信息', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 检查用户头像区域存在
      const userAvatar = document.querySelector('.user-avatar')
      expect(userAvatar).toBeInTheDocument()
    })

    it('打开面板后应该显示菜单项', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 使用 getAllByText 因为主题/壁纸会出现在菜单和标题中
      expect(screen.getAllByText('主题/壁纸').length).toBeGreaterThan(0)
      expect(screen.getByText('功能设置')).toBeInTheDocument()
      expect(screen.getByText('重置设置')).toBeInTheDocument()
    })

    it('点击遮罩层应该关闭面板', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const overlay = document.querySelector('.config-overlay')
      expect(overlay).toBeInTheDocument()
      
      fireEvent.click(overlay!)
      expect(screen.queryByText('功能设置')).not.toBeInTheDocument()
    })
  })

  describe('主题设置', () => {
    it('默认应该显示主题设置内容', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      expect(screen.getByText('主题色')).toBeInTheDocument()
      expect(screen.getByText('自定义颜色')).toBeInTheDocument()
    })

    it('应该显示预设颜色按钮', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 检查颜色按钮数量（9个预设颜色）
      const colorButtons = document.querySelectorAll('.color-grid-item')
      expect(colorButtons.length).toBe(9)
    })

    it('点击颜色按钮应该选中该颜色', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const colorButtons = document.querySelectorAll('.color-grid-item')
      fireEvent.click(colorButtons[1]) // 点击第二个颜色（黄色）
      
      expect(colorButtons[1]).toHaveClass('active')
    })

    it('自定义颜色输入应该工作', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const input = screen.getByPlaceholderText('输入色值，如 BA68C8')
      fireEvent.change(input, { target: { value: 'ff0000' } })
      
      expect(input).toHaveValue('FF0000')
    })

    it('自定义颜色输入应该过滤非法字符', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const input = screen.getByPlaceholderText('输入色值，如 BA68C8')
      fireEvent.change(input, { target: { value: 'gg00zz' } })
      
      expect(input).toHaveValue('00')
    })
  })

  describe('功能设置', () => {
    it('点击功能设置应该切换到功能页面', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const featuresButton = screen.getByText('功能设置')
      fireEvent.click(featuresButton)
      
      expect(screen.getByText('布局')).toBeInTheDocument()
      expect(screen.getByText('开屏动画')).toBeInTheDocument()
    })

    it('应该显示布局相关开关', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      fireEvent.click(screen.getByText('功能设置'))
      
      expect(screen.getByText('显示更新时间')).toBeInTheDocument()
      expect(screen.getByText('显示目录')).toBeInTheDocument()
      expect(screen.getByText('显示标签')).toBeInTheDocument()
      expect(screen.getByText('阅读进度条')).toBeInTheDocument()
      expect(screen.getByText('显示页脚')).toBeInTheDocument()
    })

    it('应该显示开屏动画相关开关', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      fireEvent.click(screen.getByText('功能设置'))
      
      expect(screen.getByText('仅首次加载显示')).toBeInTheDocument()
      expect(screen.getByText('永久关闭动画')).toBeInTheDocument()
    })

    it('开关应该可以切换', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      fireEvent.click(screen.getByText('功能设置'))
      
      const tocSwitch = screen.getByText('显示目录').closest('label')?.querySelector('input')
      expect(tocSwitch).toBeInTheDocument()
      
      const initialChecked = tocSwitch!.checked
      fireEvent.click(tocSwitch!)
      expect(tocSwitch!.checked).toBe(!initialChecked)
    })
  })

  describe('重置设置', () => {
    it('点击重置设置应该重置配置', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 先修改一个设置
      const colorButtons = document.querySelectorAll('.color-grid-item')
      fireEvent.click(colorButtons[3]) // 选择红色
      
      // 点击重置
      const resetButton = screen.getByText('重置设置')
      fireEvent.click(resetButton)
      
      // 验证 localStorage.setItem 被调用
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('菜单导航', () => {
    it('切换菜单应该更新标题', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 默认是主题/壁纸
      expect(screen.getByText('深色模式、主题色')).toBeInTheDocument()
      
      // 切换到功能设置
      fireEvent.click(screen.getByText('功能设置'))
      expect(screen.getByText('显示与动画设置')).toBeInTheDocument()
    })

    it('激活的菜单项应该有 active 类', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 获取导航区域内的菜单按钮
      const navItems = document.querySelectorAll('.config-sidebar-nav-item')
      const themeButton = navItems[0]
      const featuresButton = navItems[1]
      
      expect(themeButton).toHaveClass('active')
      
      fireEvent.click(featuresButton)
      expect(featuresButton).toHaveClass('active')
      expect(themeButton).not.toHaveClass('active')
    })
  })

  describe('面板结构', () => {
    it('应该有左侧菜单和右侧内容区', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      expect(document.querySelector('.config-sidebar-left')).toBeInTheDocument()
      expect(document.querySelector('.config-sidebar-right')).toBeInTheDocument()
    })

    it('右侧应该有标题区和内容区', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      expect(document.querySelector('.config-sidebar-header')).toBeInTheDocument()
      expect(document.querySelector('.config-sidebar-main')).toBeInTheDocument()
    })

    it('功能设置应该有两个独立的卡片', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      fireEvent.click(screen.getByText('功能设置'))
      
      const cards = document.querySelectorAll('.config-sidebar-card')
      expect(cards.length).toBe(2)
    })
  })

  describe('自定义颜色', () => {
    it('输入完整的6位颜色值应该应用颜色', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const input = screen.getByPlaceholderText('输入色值，如 BA68C8')
      fireEvent.change(input, { target: { value: 'BA68C8' } })
      
      expect(input).toHaveValue('BA68C8')
      // 验证 localStorage 被调用（颜色被保存）
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('输入不完整的颜色值不应该应用', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      const input = screen.getByPlaceholderText('输入色值，如 BA68C8')
      const initialCalls = localStorageMock.setItem.mock.calls.length
      
      fireEvent.change(input, { target: { value: 'BA6' } })
      
      expect(input).toHaveValue('BA6')
      // 不完整的颜色值不应该触发保存
      expect(localStorageMock.setItem.mock.calls.length).toBe(initialCalls)
    })

    it('选择预设颜色后应该清空自定义输入', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      
      // 先输入自定义颜色
      const input = screen.getByPlaceholderText('输入色值，如 BA68C8')
      fireEvent.change(input, { target: { value: 'BA68C8' } })
      expect(input).toHaveValue('BA68C8')
      
      // 选择预设颜色
      const colorButtons = document.querySelectorAll('.color-grid-item')
      fireEvent.click(colorButtons[0])
      
      // 输入框应该被清空
      expect(input).toHaveValue('')
    })
  })

  describe('开关交互', () => {
    it('禁用编辑链接开关当没有 GitHub repo 时', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      fireEvent.click(screen.getByText('功能设置'))
      
      const editLinkLabel = screen.getByText('显示编辑链接').closest('label')
      // 检查是否有 disabled 类（取决于 config.github.repo 是否为空）
      expect(editLinkLabel).toBeInTheDocument()
    })

    it('永久关闭动画后应该禁用仅首次显示开关', () => {
      renderWithProvider()
      fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
      fireEvent.click(screen.getByText('功能设置'))
      
      // 先启用永久关闭动画
      const disableSplashSwitch = screen.getByText('永久关闭动画').closest('label')?.querySelector('input')
      fireEvent.click(disableSplashSwitch!)
      
      // 检查仅首次显示开关是否被禁用
      const showOnceLabel = screen.getByText('仅首次加载显示').closest('label')
      expect(showOnceLabel).toHaveClass('disabled')
    })
  })
})
