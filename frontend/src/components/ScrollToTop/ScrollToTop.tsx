import { useState, useEffect, FC, useCallback } from 'react'
import styles from './scrolltotop.module.css'
import Icon from '../Icon/Icon'
import { useLocation } from 'react-router-dom'
import { useLanguageContext } from '../../contexts/LanguageContext'
import { useIsClient, useWindow } from '../../hooks/useSSR'

const ScrollToTop: FC<{
  styleMenu: boolean | undefined
}> = ({ styleMenu }) => {
  const isClient = useIsClient()
  const windowObj = useWindow()

  const { t } = useLanguageContext()

  const location = useLocation()
  const [showTopBtn, setShowTopBtn] = useState(false)

  const scrollY = useCallback(() => {
    if (!isClient || !windowObj) return
    if (windowObj.scrollY > 500) {
      setShowTopBtn(true)
    } else {
      setShowTopBtn(false)
    }
  }, [isClient, windowObj])

  useEffect(() => {
    if (!isClient || !windowObj) return
    windowObj.addEventListener('scroll', scrollY)
    return () => {
      windowObj.removeEventListener('scroll', scrollY)
    }
  }, [isClient, windowObj, scrollY])

  const goToTop = () => {
    if (!isClient || !windowObj) return
    windowObj.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    // hide #to-top-btn when on the /portfolio/colors page:
    if (location.pathname === '/portfolio/colors') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowTopBtn(false)
    }
  }, [location.pathname])

  return (
    <button
      id="to-top-btn"
      className={`to-top-btn ${styles['to-top-btn']} ${
        showTopBtn ? styles.show : ''
      } ${styleMenu ? styles.alt : ''}`}
      onClick={goToTop}
    >
      <Icon lib="bi" name="BiChevronsUp" className={styles.icon} />
      <span className="scr">{t('ScrollToTheTop')}</span>
    </button>
  )
}

export default ScrollToTop
