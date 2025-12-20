import { readFileSync, writeFileSync } from 'fs'

// 从 blog.config.ts 读取 baseUrl（简单解析）
const configContent = readFileSync('./blog.config.ts', 'utf-8')
const baseUrlMatch = configContent.match(/baseUrl:\s*['"]([^'"]*)['"]/);
const baseUrl = baseUrlMatch ? baseUrlMatch[1] : ''
const siteUrl = `https://nonfan.github.io${baseUrl}`

// 读取文章数据
const posts = JSON.parse(readFileSync('./src/generated/posts.json', 'utf-8'))

// 生成 sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${posts.map(post => `  <url>
    <loc>${siteUrl}/post/${post.slug}</loc>
    <lastmod>${new Date(post.date).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`

writeFileSync('./dist/sitemap.xml', sitemap)
console.log('Generated sitemap.xml')

// 生成 robots.txt
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`

writeFileSync('./dist/robots.txt', robots)
console.log('Generated robots.txt')
