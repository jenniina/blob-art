import { useState, useEffect, FC, useCallback } from 'react'
import Icon from '../Icon/Icon'
import { useLanguageContext } from '../../contexts/LanguageContext'
import { useIsClient, useWindow } from '../../hooks/useSSR'

const Footer: FC = () => {
  const isClient = useIsClient()
  const windowObj = useWindow()

  const { t } = useLanguageContext()

  const toTop = () => {
    if (!windowObj) return
    if (!windowObj) return
    windowObj.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }
  const [showTopBtn, setShowTopBtn] = useState(false)

  const scrollY = useCallback(() => {
    if (!windowObj) return
    if (windowObj.scrollY > 500) {
      setShowTopBtn(true)
    } else {
      setShowTopBtn(false)
    }
  }, [windowObj])

  useEffect(() => {
    if (!isClient || !windowObj) return
    windowObj.addEventListener('scroll', scrollY)
    return () => {
      windowObj.removeEventListener('scroll', scrollY)
    }
  }, [isClient, windowObj, scrollY])

  return (
    <footer id="main-footer" className={`main-footer`}>
      <a className="footer1" href="https://react.jenniina.fi/">
        <span>{t('Portfolio')}</span>
      </a>

      <a className="footer2" href="https://github.com/jenniina/blob-art">
        GitHub
      </a>

      {showTopBtn ? (
        <button
          className="footer3"
          style={{ display: 'inline-block' }}
          onClick={toTop}
        >
          {t('ScrollToTheTop')}
          <Icon
            lib="bi"
            name="BiChevronsUp"
            style={{ display: 'inline-block', marginBottom: '-0.15em' }}
          />
        </button>
      ) : (
        ''
      )}
    </footer>
  )
}
export default Footer
