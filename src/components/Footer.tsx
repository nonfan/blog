import { useConfig } from '../config/ConfigContext'

export default function Footer() {
  const { config } = useConfig()
  const { showFooter } = config.features
  const { copyright } = config.footer
  const { author } = config.site
  const { repo } = config.github

  if (!showFooter) return null

  // 从 repo 提取用户名作为 GitHub 链接
  const githubUser = repo ? repo.split('/')[0] : null
  const authorLink = githubUser ? `https://github.com/${githubUser}` : '#'

  return (
    <footer className="site-footer">
      <div className="footer-bar" />
      <div className="footer-content">
        <span className="footer-license">基于 MIT 许可发布</span>
        <span className="footer-copyright">
          Copyright © {copyright}{' '}
          <a 
            href={authorLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="footer-author"
          >
            {author?.toUpperCase()}
          </a>
        </span>
      </div>
    </footer>
  )
}
