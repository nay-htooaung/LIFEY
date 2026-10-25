import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// listens for the browser's install prompt before React mounts
import './ui/install'
// looks for new versions
import './ui/update'
import './styles/themes.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
