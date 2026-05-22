import React, {
  FC,
  useState,
  useEffect,
  forwardRef,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { useIsClient, useWindow } from '../../hooks/useSSR'
import Icon from '../Icon/Icon'
import BlobArtLogo from '../Icon/BlobArtLogo'
import styles from './nav.module.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme, useThemeUpdate } from '../../hooks/useTheme'
import useScrollDirection from '../../hooks/useScrollDirection'
import useWindowSize from '../../hooks/useWindowSize'
import {
  ReducerProps,
  breakpoint,
  breakpointSmall,
  ELanguages,
  ELanguagesLong,
} from '../../types'
import { TranslationKey } from '../../i18n/translations'
import { useOutsideClick } from '../../hooks/useOutsideClick'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../hooks/useAppDispatch'
import { logout, logoutAllDevices } from '../../reducers/authReducer'
import FormLogin from '../Login/Login'
import Register from '../Register/Register'
import { notify } from '../../reducers/notificationReducer'
import { createUser } from '../../reducers/usersReducer'
import { Select, SelectOption } from '../Select/Select'
import PasswordReset from '../PasswordReset/PasswordReset'
import Accordion from '../Accordion/Accordion'
import useCart from '../../hooks/useCart'
import { options } from '../../utils'
import { useLanguageContext } from '../../contexts/LanguageContext'
import { getErrorMessage } from '../../utils'
import { isTouchDevice } from '../../hooks/useDraggable'
import useExitVisibility from '../../hooks/useExitVisibility'
import CopyToClipboard from '../CopyToClipboard/CopyToClipboard'

type Form = 'login' | 'register' | 'reset' | null

export interface Link {
  label: string
  href: string
  name: string
}

interface LinkComponentProps {
  windowWidth: number
  breakpointSmall: number
  lightTheme: boolean
  t: (key: TranslationKey) => string
  styles: CSSModuleClasses
}

interface SkipLinkProps {
  skipLinks: Link[]
  styles: CSSModuleClasses
}

const SkipLink: FC<SkipLinkProps> = ({ skipLinks, styles }) => {
  return (
    <ul>
      {skipLinks.map((link: Link) => {
        return (
          <li key={link.href}>
            <Link
              to={link.href}
              className={`${styles['skip-link']} ${styles[link.name]}`}
            >
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

const Nav = () => {
  const isClient = useIsClient()
  const windowObj = useWindow()

  const { cart } = useCart()

  const { t, language, setLanguage } = useLanguageContext()

  const clickOutsideRef = useRef<HTMLDivElement>(null)

  // Logo dropdown
  const logoRef = useRef<HTMLDivElement>(null)
  const [logoOpen, setLogoOpen] = useState<boolean>(false)

  const closeLogoMenu = useCallback(() => {
    setLogoOpen(false)
  }, [])

  const scrollDirection = useScrollDirection()

  const user = useSelector((state: ReducerProps) => {
    return state.auth?.user
  })

  const { windowHeight, windowWidth } = useWindowSize()

  const mainMenu = useExitVisibility(false)
  const toolbar = useExitVisibility(false)

  const location = useLocation()

  const touchDevice = isTouchDevice()
  const lightTheme = useTheme()
  const toggleTheme = useThemeUpdate()
  const navigate = useNavigate()

  const [openForm, setOpenForm] = useState<Form>(null)

  const isLoginFormOpen = openForm === 'login'
  const isRegisterFormOpen = openForm === 'register'
  const isResetFormOpen = openForm === 'reset'

  const bindForm = useCallback(
    (form: Exclude<Form, null>) => (next: boolean) => {
      setOpenForm(next ? form : null)
    },
    []
  )

  const toggleToolbar = useCallback(
    (windowWidth: number) => {
      if (!toolbar.open) {
        toolbar.show()
        if (mainMenu.open && windowWidth < breakpoint) mainMenu.hide()
      } else {
        toolbar.hide()
      }
    },
    [toolbar, mainMenu]
  )

  const getAuthQueryForm = useCallback(
    (search: string): Form => {
      const params = new URLSearchParams(search)

      if (params.get('login') === 'true') {
        return 'login'
      }

      if (params.get('register') === 'true') {
        return 'register'
      }

      return null
    },
    [location.search]
  )

  const clearAuthQueryParams = useCallback(() => {
    // If URL opens login/register form, allow outside click to close it permanently
    // by removing the query params (otherwise the effect below will reopen it).
    const params = new URLSearchParams(location.search)
    const hadAuthParams =
      params.get('login') === 'true' || params.get('register') === 'true'
    if (!hadAuthParams) return

    params.delete('login')
    params.delete('register')

    const nextSearch = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true }
    )
  }, [location.pathname, location.search, navigate])

  // Close everything, respecting exit animations
  const closeAll = useCallback(() => {
    mainMenu.hide()
    toolbar.hide()
    setOpenForm(null)
  }, [toolbar, mainMenu])

  const dispatch = useAppDispatch()

  const handleLogout = useCallback(() => {
    void dispatch(logout())
  }, [dispatch])

  // From URL params
  useEffect(() => {
    if (!isClient) return
    const authForm = getAuthQueryForm(location.search)
    if (authForm) {
      toolbar.show()
      bindForm(authForm)(true)
      // Treat auth params as one-shot triggers so they don't keep reopening
      // the toolbar on unrelated query param changes (e.g. AccessibleColors mode).
      setTimeout(() => {
        clearAuthQueryParams()
      }, 200)
    }
  }, [
    location,
    isClient,
    bindForm,
    toolbar,
    clearAuthQueryParams,
    getAuthQueryForm,
  ])

  useOutsideClick({
    ref: clickOutsideRef,
    onOutsideClick: closeAll,
  })

  useOutsideClick({ ref: logoRef, onOutsideClick: closeLogoMenu })

  const [scrolled, setScrolled] = useState(false) //when false, keeps header visible

  const scrolling = useCallback(() => {
    if (!windowObj) return
    if (windowObj.scrollY > 100) {
      setScrolled(true)
    } else {
      setScrolled(false)
    }
  }, [windowObj])

  useEffect(() => {
    if (!isClient || !windowObj) return
    windowObj.addEventListener('scroll', scrolling)
    return () => {
      windowObj.removeEventListener('scroll', scrolling)
    }
  }, [isClient, windowObj, scrolling])

  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [sending, setSending] = useState(false)

  const handleRegister = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    setSending(true)
    if (password.trim() !== confirmPassword.trim()) {
      void dispatch(notify(`${t('PasswordsDoNotMatch')}`, true, 8))
      setSending(false)
      return
    }
    void dispatch(
      createUser({ name, username, password, language, verified: false })
    )
      .then(() => {
        void dispatch(
          notify(
            `${t('RegistrationSuccesful')} - ${t(
              'PleaseCheckYourEmailForYourVerificationLink'
            )} `,
            false,
            8
          )
        )
        setUsername('')
        setPassword('')
        setConfirmPassword('')
        setName('')
        setSending(false)
      })
      .catch((err: unknown) => {
        console.error(err)
        const message = getErrorMessage(err, t('Error'))
        void dispatch(notify(message, true, 8))
        setSending(false)
      })
  }

  const skipLinks = useMemo(() => {
    return [
      {
        label: t('SkipToMainNavigation'),
        href: '#site-navigation',
        name: 'navigation',
      },
      {
        label: t('SkipToMainContent'),
        href: '#main-content',
        name: 'content',
      },
      {
        label: t('SkipToFooter'),
        href: '#main-footer',
        name: 'footer',
      },
    ]
  }, [t])

  const [triggerAtBreakpoint, setTriggerAtBreakpoint] = useState<boolean>(false)

  useEffect(() => {
    // when crossing the breakpoint to either direction, set triggerAtBreakpoint to true
    if (!triggerAtBreakpoint && windowWidth >= breakpoint) {
      setTriggerAtBreakpoint(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // frame #3:
          setTriggerAtBreakpoint(false)
        })
      })
    } else if (!triggerAtBreakpoint && windowWidth < breakpoint) {
      setTriggerAtBreakpoint(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // frame #3:
          setTriggerAtBreakpoint(false)
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, breakpoint])

  const icons = useCallback(
    (label: string) => {
      if (label === t('Welcome'))
        return (
          <Icon
            lib="ri"
            name="RiHomeSmileLine"
            className={windowWidth < breakpoint ? styles.smallnav : ''}
          />
        )
      else if (label === t('Contact'))
        return (
          <Icon
            lib="bi"
            name="BiChat"
            className={windowWidth < breakpoint ? styles.smallnav : ''}
          />
        )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, triggerAtBreakpoint]
  )

  //get last part of pathname for header class
  const pageName =
    location.pathname
      .split('/')
      .filter((part) => part.length > 0)
      .pop() ?? 'home'

  const firstPartOfPageName = location.pathname.split('/')[1] ?? 'home'

  const isPortfolioMainPage =
    firstPartOfPageName === 'portfolio' && pageName === 'portfolio'

  return (
    <>
      <header
        ref={clickOutsideRef}
        className={`
                ${`main-header ${styles['main-header']}`}
                ${
                  scrollDirection === 'down' && scrolled
                    ? styles.hide
                    : styles.show
                } 
                ${isPortfolioMainPage ? styles['portfolio-main'] : ''}
                ${styles[pageName]}
                ${lightTheme ? styles.light : ''} 
                 ${styles.menumain} menumain 
                ${
                  windowHeight > windowWidth && touchDevice ? styles.mobile : ''
                } 
                ${styles[`${language}`]}
                `}
      >
        <nav className={styles['skip-links']}>
          <SkipLink skipLinks={skipLinks} styles={styles} />
        </nav>
        <div className={styles['header-inner-wrap']}>
          <div
            ref={logoRef}
            className={`${styles['left-edge']} ${
              lightTheme
                ? `${styles['logo-container']} ${styles.light}`
                : styles['logo-container']
            }`}
          >
            <Link to="/">
              <BlobArtLogo
                className={styles['logo-svg']}
                style={{ fontSize: '1.2em', verticalAlign: 'top' }}
                aria-label={t('BlobArt')}
              />
            </Link>
            <span className="scr">{t('BlobArt')}</span>
          </div>
          <button
            className={styles.settings}
            onClick={() => toggleToolbar(windowWidth)}
          >
            <Icon
              lib="io5"
              name="IoSettingsSharp"
              style={
                windowWidth > breakpoint
                  ? { fontSize: '2em' }
                  : { fontSize: '1.1em' }
              }
              aria-hidden={true}
            />
            <span
              id="settings"
              className={
                windowWidth > breakpointSmall && !touchDevice ? '' : 'scr'
              }
            >
              {t('Settings')}
            </span>
          </button>
          <nav
            id="site-navigation"
            onTransitionEnd={toolbar.onTransitionEnd}
            className={`${styles.toolbar} ${
              toolbar.open ? styles.show : toolbar.hidden ? styles.hidden : ''
            }`}
            aria-labelledby="settings"
          >
            <Select
              language={language}
              id="language-navbar"
              className={`language ${styles.language}`}
              instructions={t('LanguageTitle')}
              hide
              options={options(ELanguagesLong)}
              value={
                language
                  ? ({
                      value: language,
                      label: ELanguagesLong[language],
                    } as SelectOption)
                  : undefined
              }
              onChange={(o) => {
                setLanguage(o?.value as ELanguages)
              }}
            />
            <div className={styles.toolwrap}>
              <label htmlFor="dlt-btn">
                {lightTheme ? t('DarkMode') : t('LightMode')}
              </label>
              <button
                id="dlt-btn"
                className={
                  lightTheme
                    ? `${styles['dlt-btn']}`
                    : `${styles.active} ${styles['dlt-btn']} ${styles['toolbar-btn']}`
                }
                onClick={toggleTheme}
              >
                <div className={`${styles['dlt-inner-wrapper']}`}>
                  <div className={`${styles['dlt-btn-inner-left']}`}>
                    <div className={`${styles['dlt-innermost']}`}>
                      <span className="scr">
                        {lightTheme ? t('DarkMode') : t('LightMode')}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className={styles.loginregister}>
              {!user ? (
                <>
                  <div
                    className={`${styles.loginregisterwrap} ${
                      openForm === null ? styles.closed : ''
                    }`}
                  >
                    <FormLogin
                      setIsFormOpen={bindForm('login')}
                      isOpen={isLoginFormOpen}
                      text="nav"
                    />
                    <Register
                      setIsFormOpen={bindForm('register')}
                      isOpen={isRegisterFormOpen}
                      handleRegister={handleRegister}
                      username={username}
                      setUsername={setUsername}
                      password={password}
                      setPassword={setPassword}
                      confirmPassword={confirmPassword}
                      setConfirmPassword={setConfirmPassword}
                      name={name}
                      setName={setName}
                      text="nav"
                      sending={sending}
                    />
                  </div>
                  <div className="password-reset-wrap">
                    <Accordion
                      className="password-reset"
                      wrapperClass="password-reset-wrap"
                      text={`${t('ForgotPassword')}`}
                      isOpen={isResetFormOpen}
                      setIsFormOpen={bindForm('reset')}
                      hideBrackets={true}
                      hideButton={true}
                    >
                      <PasswordReset text="login" />
                    </Accordion>
                  </div>
                  <div className="mt3 flex column gap-half left">
                    <span>{t('IfYouDontWantToRegister')} </span>
                    <div className="flex align-center column gap-half left">
                      <CopyToClipboard
                        value={`temp${String.fromCharCode(64)}jenniina.fi`}
                        label="temp <at> jenniina <dot> fi"
                        ariaLabel={t('CopyAddressToClipboard')}
                        className="m0"
                        onClick={() => setOpenForm('login')}
                      />
                      <div className="flex column gap-half left mt1">
                        {t('Password')}:{' '}
                        <CopyToClipboard
                          value="TempAtJenniina"
                          label="TempAtJenniina"
                          ariaLabel={t('CopyToClipboard')}
                          className="m0"
                          onClick={() => setOpenForm('login')}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <FormLogin text="nav" />
              )}
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}

export default forwardRef(Nav)
