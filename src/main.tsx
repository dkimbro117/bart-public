import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './contexts/AuthContext'
import { KioskModeProvider } from './contexts/KioskModeContext'
import { SyncProvider } from './contexts/SyncContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import AuthLinkRedirect from './components/AuthLinkRedirect'
import { reportError } from './lib/reportError'
import './fonts'
import './index.css'
import './components/brand/brandStates.css'
import App from './App.tsx'

registerSW({ immediate: true })

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, 'unhandledrejection')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthLinkRedirect />
        <AuthProvider>
          <SyncProvider>
            <KioskModeProvider>
              <App />
            </KioskModeProvider>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
