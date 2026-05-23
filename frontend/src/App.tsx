import { useEffect } from 'react'
import './css/App.css'
import Nav from './components/Nav/Nav'
import Modal from './components/Modal/Modal'
import Notification from './components/Notification/Notification'
import MainWrapper from './components/MainWrapper/MainWrapper'
import { UIProvider } from './contexts/UIContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import Footer from './components/Footer/Footer'
import ScrollToTop from './components/ScrollToTop/ScrollToTop'

const App = () => {
  useEffect(() => {
    void import('./css/form.css')
  }, [])

  return (
    <>
      <UIProvider>
        <ConfirmProvider>
          <Nav />
          <MainWrapper />
          <Footer />
          <ScrollToTop />
          <Modal />
          <Notification />{' '}
        </ConfirmProvider>
      </UIProvider>
    </>
  )
}

export default App
