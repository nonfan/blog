import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  getTitleFromBody,
  cleanText,
  getExcerpt,
  generateId,
  sortPosts,
  preprocessContainers,
  generateCodeBlockHeader,
  createMarkedRenderer,
  marked,
  createCodeBlockProtector,
  preprocessDailyCalendar
} from './post-utils.js'

describe('parseFrontmatter', () => {
  it('应该正确解析完整的 frontmatter', () => {
    const content = `---
title: 测试文章
description: 这是描述
logo: /logo.png
pinned: true
type: article
tags:
  - JavaScript
  - React
---
# 正文内容`

    const { frontmatter, body } = parseFrontmatter(content)
    
    expect(frontmatter.title).toBe('测试文章')
    expect(frontmatter.description).toBe('这是描述')
    expect(frontmatter.logo).toBe('/logo.png')
    expect(frontmatter.pinned).toBe(true)
    expect(frontmatter.type).toBe('article')
    expect(frontmatter.tags).toEqual(['JavaScript', 'React'])
    expect(body).toBe('# 正文内容')
  })

  it('应该处理 pinned 为数字的情况', () => {
    const content = `---
pinned: 2
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.pinned).toBe(2)
  })

  it('应该处理 pinned 为 false 的情况', () => {
    const content = `---
pinned: false
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.pinned).toBe(false)
  })

  it('应该处理无效的 pinned 值', () => {
    const content = `---
pinned: invalid
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.pinned).toBe(false)
  })

  it('应该处理没有 frontmatter 的内容', () => {
    const content = '# 标题\n\n正文内容'
    const { frontmatter, body } = parseFrontmatter(content)
    
    expect(frontmatter).toEqual({})
    expect(body).toBe(content)
  })

  it('应该处理空标签列表', () => {
    const content = `---
title: 测试
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.tags).toEqual([])
  })

  it('应该处理 Windows 换行符', () => {
    const content = '---\r\ntitle: 测试\r\n---\r\n内容'
    const { frontmatter, body } = parseFrontmatter(content)
    expect(frontmatter.title).toBe('测试')
    expect(body).toBe('内容')
  })

  it('应该解析 toc 字段为 true', () => {
    const content = `---
toc: true
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.toc).toBe(true)
  })

  it('应该解析 toc 字段为 false', () => {
    const content = `---
toc: false
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.toc).toBe(false)
  })

  it('应该解析 toc 字段大小写不敏感', () => {
    const content = `---
toc: FALSE
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.toc).toBe(false)
  })

  it('应该解析 type 字段为 plan', () => {
    const content = `---
type: plan
---
内容`
    const { frontmatter } = parseFrontmatter(content)
    expect(frontmatter.type).toBe('plan')
  })
})

describe('getTitleFromBody', () => {
  it('应该提取一级标题', () => {
    const body = '# 文章标题\n\n正文内容'
    expect(getTitleFromBody(body)).toBe('文章标题')
  })

  it('应该返回 null 如果没有一级标题', () => {
    const body = '## 二级标题\n\n正文内容'
    expect(getTitleFromBody(body)).toBeNull()
  })

  it('应该处理标题前有空格的情况', () => {
    const body = '  一些文字\n# 标题\n内容'
    expect(getTitleFromBody(body)).toBe('标题')
  })
})

describe('cleanText', () => {
  it('应该移除代码块', () => {
    const text = '文字\n```js\nconst a = 1\n```\n更多文字'
    expect(cleanText(text)).toBe('文字 更多文字')
  })

  it('应该移除行内代码', () => {
    const text = '使用 `const` 声明'
    expect(cleanText(text)).toBe('使用 声明')
  })

  it('应该移除标题标记', () => {
    const text = '## 标题\n### 子标题'
    expect(cleanText(text)).toBe('标题 子标题')
  })

  it('应该移除列表标记', () => {
    const text = '- 项目1\n- 项目2\n1. 有序1\n2. 有序2'
    expect(cleanText(text)).toBe('项目1 项目2 有序1 有序2')
  })

  it('应该移除引用标记', () => {
    const text = '> 引用内容'
    expect(cleanText(text)).toBe('引用内容')
  })

  it('应该移除图片但保留链接文字', () => {
    const text = '![图片](url) [链接](url)'
    expect(cleanText(text)).toBe('链接')
  })

  it('应该移除脚注引用', () => {
    const text = '文字[^1]更多文字'
    expect(cleanText(text)).toBe('文字更多文字')
  })

  it('应该移除 HTML 标签', () => {
    const text = '<div>内容</div>'
    expect(cleanText(text)).toBe('内容')
  })

  it('应该移除粗体斜体标记但保留文字', () => {
    const text = '**粗体** *斜体* __粗体2__ _斜体2_ ~~删除~~'
    expect(cleanText(text)).toBe('粗体 斜体 粗体2 斜体2 删除')
  })

  it('应该移除分割线', () => {
    const text = '上面\n---\n下面'
    expect(cleanText(text)).toBe('上面 下面')
  })

  it('应该移除表格', () => {
    const text = '| 列1 | 列2 |\n| --- | --- |\n| 值1 | 值2 |'
    expect(cleanText(text)).toBe('')
  })
})

describe('getExcerpt', () => {
  it('应该从标题后提取摘要', () => {
    const body = '## 标题\n\n这是摘要内容，用于测试。'
    const excerpt = getExcerpt(body)
    expect(excerpt).toBe('这是摘要内容，用于测试。')
  })

  it('应该截断过长的摘要', () => {
    const body = '## 标题\n\n' + '这是很长的内容。'.repeat(20)
    const excerpt = getExcerpt(body, 50)
    expect(excerpt.length).toBeLessThanOrEqual(53) // 50 + '...'
    expect(excerpt).toContain('...')
  })

  it('应该优先使用标题前的文本', () => {
    const body = '这是前言内容\n\n## 标题\n\n正文'
    const excerpt = getExcerpt(body)
    expect(excerpt).toBe('这是前言内容')
  })

  it('应该处理没有标题的内容', () => {
    const body = '这是纯文本内容，没有任何标题。'
    const excerpt = getExcerpt(body)
    expect(excerpt).toBe('这是纯文本内容，没有任何标题。')
  })
})

describe('generateId', () => {
  it('应该将空格转为连字符', () => {
    expect(generateId('Hello World')).toBe('hello-world')
  })

  it('应该转为小写', () => {
    expect(generateId('HELLO')).toBe('hello')
  })

  it('应该保留中文', () => {
    expect(generateId('服务拆分')).toBe('服务拆分')
  })

  it('应该移除特殊字符', () => {
    expect(generateId('Hello! World?')).toBe('hello-world')
  })

  it('应该返回 heading 如果结果为空', () => {
    expect(generateId('!@#$%')).toBe('heading')
  })
})

describe('sortPosts', () => {
  it('应该将置顶文章排在前面', () => {
    const posts = [
      { title: 'A', pinned: false, date: '2024-01-03' },
      { title: 'B', pinned: true, date: '2024-01-01' },
      { title: 'C', pinned: false, date: '2024-01-02' }
    ]
    const sorted = sortPosts(posts)
    expect(sorted[0].title).toBe('B')
  })

  it('应该按数字置顶优先级排序', () => {
    const posts = [
      { title: 'A', pinned: 2, date: '2024-01-01' },
      { title: 'B', pinned: 1, date: '2024-01-01' },
      { title: 'C', pinned: true, date: '2024-01-01' }
    ]
    const sorted = sortPosts(posts)
    expect(sorted[0].title).toBe('B')
    expect(sorted[1].title).toBe('A')
    expect(sorted[2].title).toBe('C')
  })

  it('应该按日期降序排序非置顶文章', () => {
    const posts = [
      { title: 'A', pinned: false, date: '2024-01-01' },
      { title: 'B', pinned: false, date: '2024-01-03' },
      { title: 'C', pinned: false, date: '2024-01-02' }
    ]
    const sorted = sortPosts(posts)
    expect(sorted[0].title).toBe('B')
    expect(sorted[1].title).toBe('C')
    expect(sorted[2].title).toBe('A')
  })
})

describe('Markdown 渲染', () => {
  describe('链接渲染', () => {
    it('外部链接应该在新标签页打开', () => {
      const html = marked.parse('[GitHub](https://github.com)')
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
      expect(html).toContain('href="https://github.com"')
    })

    it('http 链接也应该在新标签页打开', () => {
      const html = marked.parse('[链接](http://example.com)')
      expect(html).toContain('target="_blank"')
    })

    it('内部链接不应该有 target="_blank"', () => {
      const html = marked.parse('[首页](/)')
      expect(html).not.toContain('target="_blank"')
      expect(html).toContain('href="/"')
    })

    it('带标题的链接应该有 title 属性', () => {
      const html = marked.parse('[链接](https://example.com "示例网站")')
      expect(html).toContain('title="示例网站"')
    })

    it('相对路径链接不应该有 target="_blank"', () => {
      const html = marked.parse('[文章](./post.html)')
      expect(html).not.toContain('target="_blank"')
    })
  })

  describe('图片渲染', () => {
    it('图片应该有 loading="lazy" 属性', () => {
      const html = marked.parse('![Logo](https://example.com/logo.png)')
      expect(html).toContain('loading="lazy"')
      expect(html).toContain('src="https://example.com/logo.png"')
      expect(html).toContain('alt="Logo"')
    })

    it('带标题的图片应该有 title 属性', () => {
      const html = marked.parse('![Logo](https://example.com/logo.png "网站Logo")')
      expect(html).toContain('title="网站Logo"')
    })

    it('没有 alt 的图片应该有空 alt', () => {
      const html = marked.parse('![](https://example.com/logo.png)')
      expect(html).toContain('alt=""')
    })
  })

  describe('行内代码渲染', () => {
    it('行内代码应该有 inline-code 类', () => {
      const html = marked.parse('使用 `const` 声明常量')
      expect(html).toContain('<code class="inline-code">const</code>')
    })
  })

  describe('标题渲染', () => {
    it('标题应该有锚点链接', () => {
      const html = marked.parse('## 服务拆分')
      expect(html).toContain('class="heading-anchor"')
      expect(html).toContain('class="anchor-link"')
      expect(html).toContain('#</a>')
    })

    it('英文标题 ID 应该转为小写', () => {
      const html = marked.parse('## Hello World')
      expect(html).toContain('id="hello-world"')
    })

    it('中文标题应该保留中文 ID', () => {
      const html = marked.parse('## 服务拆分')
      expect(html).toMatch(/id="服务拆分(-\d+)?"/)
    })
  })

  describe('分割线渲染', () => {
    it('带文字的分割线应该正确渲染', () => {
      const html = marked.parse('---AI 润色版---')
      expect(html).toContain('class="divider-with-text"')
      expect(html).toContain('class="divider-text"')
      expect(html).toContain('AI 润色版')
    })

    it('普通段落不应该被当作分割线', () => {
      const html = marked.parse('这是普通段落')
      expect(html).not.toContain('divider-with-text')
      expect(html).toContain('<p>这是普通段落</p>')
    })
  })
})

describe('preprocessContainers', () => {
  it('应该处理 info 容器', () => {
    const input = `::: info
这是信息内容
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('class="custom-block info"')
    expect(result).toContain('class="custom-block-title"')
    expect(result).toContain('INFO')
    expect(result).toContain('这是信息内容')
  })

  it('应该处理 tip 容器', () => {
    const input = `::: tip
这是提示内容
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('class="custom-block tip"')
    expect(result).toContain('TIP')
  })

  it('应该处理 warning 容器', () => {
    const input = `::: warning
这是警告内容
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('class="custom-block warning"')
    expect(result).toContain('WARNING')
  })

  it('应该处理 danger 容器', () => {
    const input = `::: danger
这是危险内容
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('class="custom-block danger"')
    expect(result).toContain('DANGER')
  })

  it('应该处理 details 容器', () => {
    const input = `::: details 详情
这是详情内容
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('<details class="custom-block details">')
    expect(result).toContain('<summary>详情</summary>')
    expect(result).toContain('这是详情内容')
  })

  it('应该支持自定义标题', () => {
    const input = `::: tip 小贴士
自定义标题的内容
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('小贴士')
    expect(result).not.toContain('TIP')
  })

  it('应该处理多个容器', () => {
    const input = `::: info
信息1
:::

::: warning
警告1
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('class="custom-block info"')
    expect(result).toContain('class="custom-block warning"')
  })

  it('应该保留容器内的 Markdown 语法', () => {
    const input = `::: tip
- 列表项1
- 列表项2
:::`
    const result = preprocessContainers(input)
    expect(result).toContain('- 列表项1')
    expect(result).toContain('- 列表项2')
  })

  it('不应该处理不支持的容器类型', () => {
    const input = `::: note
这不是支持的类型
:::`
    const result = preprocessContainers(input)
    expect(result).toBe(input)
  })
})


describe('generateCodeBlockHeader', () => {
  describe('普通代码块', () => {
    it('有标题时应该添加 has-title 类', () => {
      const html = generateCodeBlockHeader({ lang: 'javascript', title: 'example.js' })
      expect(html).toContain('class="code-dots has-title"')
      expect(html).toContain('<div class="code-title">example.js</div>')
    })

    it('无标题时不应该有 has-title 类', () => {
      const html = generateCodeBlockHeader({ lang: 'javascript' })
      expect(html).toContain('class="code-dots"')
      expect(html).not.toContain('has-title')
      expect(html).not.toContain('code-title')
    })

    it('应该包含三个圆点', () => {
      const html = generateCodeBlockHeader({ lang: 'typescript', title: 'test.ts' })
      expect(html).toContain('class="dot red"')
      expect(html).toContain('class="dot yellow"')
      expect(html).toContain('class="dot green"')
    })

    it('应该显示语言标签', () => {
      const html = generateCodeBlockHeader({ lang: 'python', title: 'main.py' })
      expect(html).toContain('<div class="code-lang">python</div>')
    })
  })

  describe('代码组', () => {
    it('代码组 header 不应该有 has-title 类', () => {
      const html = generateCodeBlockHeader({ lang: 'javascript', isCodeGroup: true })
      expect(html).toContain('class="code-dots"')
      expect(html).not.toContain('has-title')
    })

    it('代码组应该使用 code-group-header 类', () => {
      const html = generateCodeBlockHeader({ lang: 'javascript', isCodeGroup: true })
      expect(html).toContain('class="code-group-header"')
    })

    it('代码组应该包含三个圆点', () => {
      const html = generateCodeBlockHeader({ lang: 'javascript', isCodeGroup: true })
      expect(html).toContain('class="dot red"')
      expect(html).toContain('class="dot yellow"')
      expect(html).toContain('class="dot green"')
    })
  })
})


describe('createMarkedRenderer', () => {
  it('应该返回 renderer 和 resetIdCounts 函数', () => {
    const { renderer, resetIdCounts } = createMarkedRenderer()
    expect(renderer).toBeDefined()
    expect(typeof resetIdCounts).toBe('function')
  })

  it('resetIdCounts 应该重置标题 ID 计数', () => {
    const { renderer, resetIdCounts } = createMarkedRenderer()
    marked.use({ renderer })
    
    // 渲染两个相同的标题
    marked.parse('## 测试标题')
    const html1 = marked.parse('## 测试标题')
    expect(html1).toContain('id="测试标题-1"')
    
    // 重置后应该从头开始计数
    resetIdCounts()
    const html2 = marked.parse('## 测试标题')
    expect(html2).toContain('id="测试标题"')
    expect(html2).not.toContain('id="测试标题-')
  })
})

describe('getExcerpt 边界情况', () => {
  it('应该处理只有代码块的内容', () => {
    const body = '```js\nconst a = 1\n```'
    const excerpt = getExcerpt(body)
    expect(excerpt).toBe('')
  })

  it('应该处理三级标题后的内容', () => {
    const body = '### 三级标题\n\n这是三级标题后的内容'
    const excerpt = getExcerpt(body)
    expect(excerpt).toBe('这是三级标题后的内容')
  })
})

describe('sortPosts 边界情况', () => {
  it('应该处理相同日期的文章', () => {
    const posts = [
      { title: 'A', pinned: false, date: '2024-01-01' },
      { title: 'B', pinned: false, date: '2024-01-01' }
    ]
    const sorted = sortPosts(posts)
    expect(sorted.length).toBe(2)
  })

  it('应该处理 true 置顶和数字置顶混合', () => {
    const posts = [
      { title: 'A', pinned: true, date: '2024-01-01' },
      { title: 'B', pinned: 3, date: '2024-01-01' },
      { title: 'C', pinned: true, date: '2024-01-02' }
    ]
    const sorted = sortPosts(posts)
    // 数字置顶优先
    expect(sorted[0].title).toBe('B')
    // true 置顶按日期排序
    expect(sorted[1].title).toBe('C')
    expect(sorted[2].title).toBe('A')
  })
})

describe('cleanText 边界情况', () => {
  it('应该处理嵌套的 Markdown 语法', () => {
    const text = '**_粗斜体_**'
    const result = cleanText(text)
    expect(result).toBe('粗斜体')
  })

  it('应该处理空内容', () => {
    const result = cleanText('')
    expect(result).toBe('')
  })

  it('应该处理只有空格的内容', () => {
    const result = cleanText('   ')
    expect(result).toBe('')
  })
})

describe('generateId 边界情况', () => {
  it('应该处理混合中英文', () => {
    expect(generateId('Hello 世界')).toBe('hello-世界')
  })

  it('应该处理多个连续空格', () => {
    expect(generateId('Hello   World')).toBe('hello-world')
  })

  it('应该处理数字', () => {
    expect(generateId('React 18 新特性')).toBe('react-18-新特性')
  })
})


describe('createCodeBlockProtector', () => {
  it('应该保护三反引号代码块', () => {
    const protector = createCodeBlockProtector()
    const input = '文字\n```js\nconst a = 1\n```\n更多文字'
    const protected_ = protector.protect(input)
    
    expect(protected_).not.toContain('```')
    expect(protected_).toContain('__PROTECTED_CODE_BLOCK_')
    expect(protector.getCount()).toBe(1)
  })

  it('应该保护四反引号代码块', () => {
    const protector = createCodeBlockProtector()
    const input = '````md\n```js\ncode\n```\n````'
    const protected_ = protector.protect(input)
    
    expect(protected_).not.toContain('````')
    expect(protector.getCount()).toBe(1)
  })

  it('应该保护行内代码', () => {
    const protector = createCodeBlockProtector()
    const input = '使用 `const` 和 `let` 声明'
    const protected_ = protector.protect(input)
    
    expect(protected_).not.toContain('`const`')
    expect(protected_).not.toContain('`let`')
    expect(protector.getCount()).toBe(2)
  })

  it('应该正确恢复代码块', () => {
    const protector = createCodeBlockProtector()
    const input = '文字\n```js\nconst a = 1\n```\n更多文字'
    const protected_ = protector.protect(input)
    const restored = protector.restore(protected_)
    
    expect(restored).toBe(input)
  })

  it('应该正确恢复多个代码块', () => {
    const protector = createCodeBlockProtector()
    const input = '```js\na\n```\n文字\n```py\nb\n```'
    const protected_ = protector.protect(input)
    const restored = protector.restore(protected_)
    
    expect(restored).toBe(input)
    expect(protector.getCount()).toBe(2)
  })

  it('应该处理空内容', () => {
    const protector = createCodeBlockProtector()
    const protected_ = protector.protect('')
    const restored = protector.restore(protected_)
    
    expect(restored).toBe('')
    expect(protector.getCount()).toBe(0)
  })
})

describe('preprocessDailyCalendar', () => {
  it('应该解析基本的日历语法', () => {
    const input = `:::daily 每日英语
2026-01: 1,2,3
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('class="daily-calendar"')
    expect(result).toContain('每日英语')
    expect(result).toContain('2026年1月')
  })

  it('应该正确计算完成天数', () => {
    const input = `:::daily 测试任务
2026-01: 1,2,3,4,5
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('5/31')
  })

  it('应该支持空月份', () => {
    const input = `:::daily 测试任务
2026-01:
2026-02:
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('2026年1月')
    expect(result).toContain('2026年2月')
    expect(result).toContain('0/31')
    expect(result).toContain('0/28')
  })

  it('应该在100%完成时自动勾选', () => {
    // 2026年2月有28天
    const allDays = Array.from({ length: 28 }, (_, i) => i + 1).join(',')
    const input = `:::daily 测试任务
2026-02: ${allDays}
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('checked')
    expect(result).toContain('28/28')
    expect(result).toContain('100%')
  })

  it('未完成时不应该勾选', () => {
    const input = `:::daily 测试任务
2026-01: 1,2,3
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('<input type="checkbox" disabled class="daily-checkbox">')
    expect(result).not.toContain('checked')
  })

  it('应该保护代码块内的语法不被解析', () => {
    const input = `\`\`\`markdown
:::daily 示例任务
2026-01: 1,2,3
:::
\`\`\``
    const result = preprocessDailyCalendar(input)
    
    // 代码块内的内容应该保持原样
    expect(result).toContain(':::daily 示例任务')
    expect(result).not.toContain('class="daily-calendar"')
  })

  it('应该处理多个日历', () => {
    const input = `:::daily 任务1
2026-01: 1,2
:::

:::daily 任务2
2026-02: 3,4
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('任务1')
    expect(result).toContain('任务2')
    expect(result).toContain('id="daily-calendar-0"')
    expect(result).toContain('id="daily-calendar-1"')
  })

  it('应该正确标记完成的日期', () => {
    const input = `:::daily 测试
2026-01: 1,15,31
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('class="daily-day completed" data-day="1"')
    expect(result).toContain('class="daily-day completed" data-day="15"')
    expect(result).toContain('class="daily-day completed" data-day="31"')
    expect(result).toContain('class="daily-day" data-day="2"')
  })

  it('应该生成正确的星期标题', () => {
    const input = `:::daily 测试
2026-01: 1
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toContain('<span>日</span>')
    expect(result).toContain('<span>一</span>')
    expect(result).toContain('<span>六</span>')
  })

  it('没有有效月份数据时应该返回原内容', () => {
    const input = `:::daily 测试
无效数据
:::`
    const result = preprocessDailyCalendar(input)
    
    expect(result).toBe(input)
  })

  it('应该处理四反引号代码块', () => {
    const input = `\`\`\`\`md
:::daily 示例
2026-01: 1
:::
\`\`\`\``
    const result = preprocessDailyCalendar(input)
    
    expect(result).not.toContain('class="daily-calendar"')
    expect(result).toContain(':::daily 示例')
  })
})
