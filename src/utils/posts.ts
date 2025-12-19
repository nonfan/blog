import type { Post } from '../types/post'
import postsData from '../generated/posts.json'

const postModules = import.meta.glob<string>('/posts/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true
})

export function getAllPosts(): Post[] {
  return postsData as Post[]
}

export function getPostBySlug(slug: string): { post: Post; content: string } | null {
  const post = postsData.find((p: Post) => p.slug === slug)
  if (!post) return null

  const content = postModules[`/posts/${slug}.mdx`]
  if (!content) return null

  // Normalize line endings and remove frontmatter
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const body = normalized.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
  return { post: post as Post, content: body }
}
