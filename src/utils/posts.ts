import type { Post } from '../types/post'
import postsData from '../generated/posts.json'

const postModules = import.meta.glob<string>('/posts/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true
})

// 类型断言，将 JSON 数据转换为 Post 类型
const posts = postsData as unknown as Post[]

export function getAllPosts(): Post[] {
  return posts
}

export function getPostBySlug(slug: string): { post: Post; content: string } | null {
  const post = posts.find(p => p.slug === slug)
  if (!post) return null

  const content = postModules[`/posts/${slug}.mdx`]
  if (!content) return null

  // Normalize line endings and remove frontmatter
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const body = normalized.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
  return { post, content: body }
}
