import { useConfig } from '../config/ConfigContext'

export default function Footer() {
  const { config } = useConfig()
  const { showFooter } = config.features
  const { copyright, author, authorLink } = config.footer

  if (!showFooter) return null

  return (
    <footer className="site-footer">
      <div className="footer-bar" />
      <div className="footer-content">
        <span className="footer-license">基于 MIT 许可发布</span>
        <span className="footer-copyright">
          Copyright © {copyright}{' '}
          {authorLink ? (
            <a
              href={authorLink}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-author"
            >
              {author}
            </a>
          ) : (
            <span className="footer-author">{author}</span>
          )}
        </span>
      </div>
    </footer>
  )
}
