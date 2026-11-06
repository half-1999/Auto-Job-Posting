import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { captureInstallEvents } from '@/pwa/installPrompt'
import './index.css'

// Before the first render, so an early beforeinstallprompt is kept.
captureInstallEvents()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
