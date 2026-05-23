import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import store from './store.client'
import './css/index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { ModalProvider } from './hooks/useModal'
import { LanguageProvider } from './contexts/LanguageContext'
import { BlobProvider } from './components/Blob/components/BlobProvider'
import { applyBlobMigrationFromWindowName } from './utils/blobMigration'

applyBlobMigrationFromWindowName()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <BlobProvider>
          <ThemeProvider>
            <Provider store={store}>
              <HelmetProvider>
                <ModalProvider>
                  <App />
                </ModalProvider>
              </HelmetProvider>
            </Provider>
          </ThemeProvider>
        </BlobProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)
