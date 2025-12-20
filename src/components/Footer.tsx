import { useConfig } from '../config/ConfigContext'

export default function Footer() {
  const { config } = useConfig()
  const { showFooter } = config.features
  const { copyright } = config.footer
  const { author } = config.site

  if (!showFooter) return null

  return (
    <footer className="site-footer">
      <div className="footer-bar" />
      <div className="footer-content">
        <span className="footer-license">基于 MIT 许可发布</span>
        <span className="footer-copyright">
          Copyright © {copyright} <a href="#" className="footer-author">{author?.toUpperCase()}</a>
        </span>
      </div>
    </footer>
  )
}
