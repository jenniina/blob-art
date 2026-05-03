import { useEffect, useRef, useCallback } from 'react'
import styles from './modal.module.css'
import { useModal } from '../../hooks/useModal'
import { useLanguageContext } from '../../contexts/LanguageContext'

const Modal = () => {
  const { modal, closeModal } = useModal()

  const { t } = useLanguageContext()

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  const handleClose = useCallback(() => {
    closeModal()
    if (previouslyFocusedElement.current)
      previouslyFocusedElement.current.focus()
    else document?.body.focus()
  }, [closeModal])

  useEffect(() => {
    if (modal) {
      previouslyFocusedElement.current = document?.activeElement as HTMLElement

      closeButtonRef.current?.focus()

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const focusableElements =
            closeButtonRef.current?.parentElement?.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          if (!focusableElements || focusableElements.length === 0) {
            e.preventDefault()
            return
          }
          const firstElement = focusableElements?.[0] as HTMLElement
          const lastElement = focusableElements?.[
            focusableElements.length - 1
          ] as HTMLElement

          if (e.shiftKey) {
            // Shift + Tab
            if (document?.activeElement === firstElement) {
              e.preventDefault()
              lastElement?.focus()
            }
          } else {
            // Tab
            if (document?.activeElement === lastElement) {
              e.preventDefault()
              firstElement?.focus()
            }
          }
        } else if (e.key === 'Escape') {
          handleClose()
        }
      }

      document?.addEventListener('keydown', handleKeyDown)

      return () => {
        document?.removeEventListener('keydown', handleKeyDown)
        if (previouslyFocusedElement.current)
          previouslyFocusedElement.current.focus()
        else document?.body.focus()
      }
    }
  }, [modal, handleClose])

  if (!modal?.children) {
    return null
  }

  return (
    <div
      className={`${styles['modal-overlay']}`}
      onClick={handleClose}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') handleClose()
      }}
      tabIndex={0}
      role="button"
      aria-label="Close modal"
    >
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={`${styles['modal-content']} ${modal.className ?? ''}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
        }}
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
      >
        <button
          ref={closeButtonRef}
          className={`${styles['close-button']} tooltip-wrap`}
          onClick={handleClose}
        >
          <span aria-hidden="true">&times;</span>
          <span className="scr">{t('Close')}</span>
          <span aria-hidden="true" className="tooltip below left narrow2">
            {t('Close')}
          </span>
        </button>
        {modal?.children}
      </div>
    </div>
  )
}

export default Modal
