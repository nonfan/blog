// 博客配置文件
// 修改此文件后需要重新构建

export default {
  // 站点信息
  site: {
    // 部署路径：'/' 表示根目录，'/blog' 表示子目录（GitHub Pages 项目页面需要设置为 '/仓库名'）
    baseUrl: '/blog',
    title: 'My Blog',
    description: '我的个人博客',
    author: 'mofan1',
    logo: 'vite.svg', // logo 文件名（放在 public 目录下，自动拼接 /）
  },

  // GitHub 配置（用于编辑链接）
  github: {
    repo: 'nonfan/blog', // 仓库地址，如 'username/repo'
    branch: 'main',
    postsDir: 'posts',
  },

  // 默认主题色
  theme: {
    primaryColor: '#3b82f6', // 蓝色
    // 可选: '#8b5cf6' 紫色, '#ec4899' 粉色, '#ef4444' 红色,
    //       '#f97316' 橙色, '#22c55e' 绿色, '#06b6d4' 青色
  },

  // 功能开关默认值
  features: {
    showEditLink: true, // 显示 GitHub 编辑链接
    showLastUpdated: true, // 显示最后更新时间
    showToc: true, // 显示目录
    showTags: true, // 显示标签
    showSplashOnce: false, // 开屏动画只显示一次（默认每次刷新都显示）
    disableSplash: false, // 永久关闭开屏动画
    showFooter: true, // 显示页脚
  },

  // 页脚配置
  footer: {
    copyright: '2025-present', // 版权年份
  },
}
