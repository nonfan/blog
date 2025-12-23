import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  getTitleFromBody,
  cleanText,
  getExcerpt,
  generateId,
  sortPosts,
  marked
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
