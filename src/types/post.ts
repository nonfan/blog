export interface Post {
  slug: string
  title: string
  tags: string[]
  date: string
  logo?: string
  excerpt: string
  pinned?: boolean
}
