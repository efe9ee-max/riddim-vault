import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AudioProvider } from './context/AudioContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AudioProvider>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1b2e',
            color: '#e2e8f0',
            border: '1px solid #2a2d4a',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#07080d' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#07080d' },
          },
        }}
      />
    </AudioProvider>
  </React.StrictMode>
)
