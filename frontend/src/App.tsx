import { useRef } from 'react'
import './css/App.css'
import './css/form.css'
import Nav from './components/Nav/Nav'
import Modal from './components/Modal/Modal'
import Notification from './components/Notification/Notification'
import MainWrapper from './components/MainWrapper/MainWrapper'
import { RefObject } from './types'
import { UIProvider } from './contexts/UIContext'
import useLocalStorage from './hooks/useStorage'
import { ConfirmProvider } from './contexts/ConfirmContext'
import Footer from './components/Footer/Footer'
import ScrollToTop from './components/ScrollToTop/ScrollToTop'

const App = () => {
  const [styleMenu, setStyleMenu] = useLocalStorage<boolean>(
    'styleOfMenu',
    false
  )
  const menuStyleRef = useRef() as RefObject<{ getStyle: () => boolean }>

  return (
    <>
      <UIProvider menuStyle={menuStyleRef}>
        <ConfirmProvider>
          <Nav setStyleMenu={setStyleMenu} ref={menuStyleRef} />
          <MainWrapper />
          <Footer styleMenu={styleMenu} />
          <ScrollToTop styleMenu={styleMenu} />
          <Modal />
          <Notification />{' '}
        </ConfirmProvider>
      </UIProvider>
    </>
  )
}

export default App
