```
██████╗ ██╗      ██████╗  ██████╗ 
██╔══██╗██║     ██╔═══██╗██╔════╝ 
██████╔╝██║     ██║   ██║██║  ███╗
██╔══██╗██║     ██║   ██║██║   ██║
██████╔╝███████╗╚██████╔╝╚██████╔╝
╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ 
```

# Minimalist Blog

一个简洁的个人博客，基于 React + TypeScript + Vite 构建。

## ✨ 特性

- 📝 MDX 文章支持
- 🎨 主题切换（亮色/暗色/跟随系统）
- 🎯 自定义主题色（7 种预设色）
- 📱 响应式设计
- 🔍 文章搜索
- 📌 文章置顶（支持排序）
- 🏷️ 标签筛选（可折叠标签栏）
- 📖 文章目录导航（移动端下拉卡片）
- ✨ 代码高亮（Shiki）
- 📦 代码组（多语言切换展示）
- 🔗 GitHub 编辑链接
- 🎬 开屏动画（可配置）
- 📄 PDF 导出
- 🔄 上/下篇文章导航
- 🖼️ 图片懒加载 + 灯箱预览
- 🔍 SEO 优化（meta 标签、sitemap）
- 📝 文章类型支持（技术文章/散文随笔）
- 💬 自定义容器（info/tip/warning/danger/details）
- 📐 数学公式支持（KaTeX）

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

## ⚙️ 配置

编辑 `blog.config.ts` 配置博客：

```ts
export default {
  site: {
    baseUrl: '/blog',        // 部署路径
    title: 'My Blog',        // 站点标题
    description: '我的博客',  // 站点描述
    author: 'Your Name',     // 作者
    logo: 'logo.svg',        // Logo（放在 public 目录）
  },
  github: {
    repo: 'username/repo',   // GitHub 仓库
    branch: 'main',
    postsDir: 'posts',
  },
  theme: {
    primaryColor: '#3b82f6', // 默认主题色
  },
  features: {
    showEditLink: true,      // 显示编辑链接
    showLastUpdated: true,   // 显示更新时间
    showToc: true,           // 显示目录
    showTags: true,          // 显示标签
    showSplashOnce: false,   // 开屏动画只显示一次
    disableSplash: false,    // 永久关闭开屏动画
  },
}
```

### 主题色选项

| 颜色 | 色值 |
|------|------|
| 蓝色 | `#3b82f6` |
| 紫色 | `#8b5cf6` |
| 粉色 | `#ec4899` |
| 红色 | `#ef4444` |
| 橙色 | `#f97316` |
| 绿色 | `#22c55e` |
| 青色 | `#06b6d4` |

## 📝 写文章

在 `posts/` 目录创建 `.mdx` 文件：

```yaml
---
title: 文章标题           # 可选，默认取一级标题
description: 文章摘要     # 可选，默认取正文前 200 字
tags:
  - 标签1
  - 标签2
logo: https://example.com/logo.png  # 可选，文章封面
pinned: true              # 可选，置顶（无顺序）
pinned: 1                 # 可选，置顶并指定顺序（数字越小越靠前）
type: article             # 可选，文章类型：tech（默认）或 article（散文/随笔）
---

# 文章标题

文章内容...
```

### 文章类型

- `type: tech`（默认）- 技术文章，显示目录、代码高亮、PDF 导出等
- `type: article` - 散文/随笔风格：
  - 段落首行缩进两格
  - 标题和标签居中显示
  - 更大的行高和字间距
  - 隐藏目录导航
  - 隐藏 PDF 导出按钮
  - 更窄的内容宽度（800px）

### 置顶说明

- `pinned: true` - 置顶文章，按日期排序
- `pinned: 1` - 置顶文章，数字指定顺序（1 最靠前）
- 数字优先级高于 `true`

### 代码块标题

````markdown
```ts [filename.ts]
const hello = 'world'
```
````

### 代码组

多个相关代码块可以组合成代码组，通过标签切换查看：

````markdown
:::code-group

```js [config.js]
module.exports = { name: 'my-app' }
```

```ts [config.ts]
export default { name: 'my-app' } as const
```

:::
````

### 自定义容器

支持 VitePress 风格的自定义容器：

```markdown
::: info
信息提示
:::

::: tip
有用的建议
:::

::: warning
警告信息
:::

::: danger
危险警告
:::

::: details 点击展开
可折叠的详情内容
:::
```

### 数学公式

支持 KaTeX 数学公式渲染：

```markdown
行内公式：$E = mc^2$

块级公式：

$
\frac{n!}{k!(n-k)!} = \binom{n}{k}
$
```

## 🏷️ 标签筛选

首页顶部有标签筛选栏：
- 默认显示一行，点击展开查看全部
- 标签按文章数量排序
- 点击标签筛选文章
- 点击文章卡片上的标签也可筛选

## 📄 PDF 导出

文章页面标题旁有 PDF 按钮，点击使用浏览器打印功能导出 PDF。

## 🔄 文章导航

文章底部显示上一篇/下一篇导航：
- 优先推荐同标签的文章
- 无同标签时按日期顺序推荐

## 🚀 部署到 GitHub Pages

1. Fork 或创建仓库
2. 修改 `blog.config.ts` 中的 `baseUrl` 和 `repo`
3. 在仓库 Settings → Pages → Source 选择 **GitHub Actions**
4. 推送代码，自动部署

构建时会自动生成 `sitemap.xml` 和 `robots.txt`。

## 📁 项目结构

```
├── posts/              # 文章目录（.mdx 文件）
├── public/             # 静态资源
├── scripts/            # 构建脚本
│   ├── generate-posts.js    # 文章预处理
│   └── generate-sitemap.js  # 生成 sitemap
├── src/
│   ├── components/     # 组件
│   ├── config/         # 配置
│   ├── generated/      # 生成的文件（自动）
│   ├── pages/          # 页面
│   ├── types/          # 类型定义
│   └── utils/          # 工具函数
├── blog.config.ts      # 博客配置
└── vite.config.ts      # Vite 配置
```

## 🛠️ 技术栈

- React 19
- TypeScript
- Vite
- React Router
- Shiki（代码高亮）
- Marked（Markdown 解析）
- GSAP（动画）

## 📄 License

MIT