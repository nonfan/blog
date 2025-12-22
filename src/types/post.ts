export interface Post {
  slug: string
  title: string
  tags: string[]
  date: string
  logo?: string
  excerpt: string
  pinned?: number | boolean // 数字表示置顶顺序，true 等同于 1
  type?: 'tech' | 'article' // tech: 技术文章（默认），article: 散文/随笔
}
