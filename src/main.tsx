import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initAppCheck } from './lib/firebase'

// App Check is required by Firebase AI Logic. Debug tokens are used on
// localhost (VITE_APPCHECK_DEBUG=true); reCAPTCHA v3 on the hosted demo.
initAppCheck()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
