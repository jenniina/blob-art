import React, { createContext, FC, ReactNode } from 'react'
import { isTouchDevice } from '../hooks/useDraggable'
import { useTheme } from '../hooks/useTheme'
import { useScrollbarWidth } from '../hooks/useScrollbarWidth'
import { useLanguageContext } from './LanguageContext'

interface UIContextProps {
  touchDevice: boolean
  lightTheme: boolean
}

export const UIContext = createContext<UIContextProps | undefined>(undefined)

export const UIProvider: FC<{
  children: ReactNode
}> = ({ children }) => {
  const { language } = useLanguageContext()

  const touchDevice = isTouchDevice()
  const lightTheme = useTheme()
  const scrollbarWidth = useScrollbarWidth()
  const styleInnerWrap: React.CSSProperties = {
    ['--scrollbar_width' as string]: `${scrollbarWidth}px`,
  }

  return (
    <UIContext.Provider
      value={{
        touchDevice,
        lightTheme,
      }}
    >
      <div
        className={`App ${lightTheme ? 'light' : ''} ${
          touchDevice ? 'touch' : ''
        } ${language}`}
      >
        <div className="App-inner-wrap" style={styleInnerWrap}>
          {children}
        </div>
      </div>
    </UIContext.Provider>
  )
}
