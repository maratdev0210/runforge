import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

async function startApp() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { worker } = await import('./app/mocks/browser')

    await worker.start({
      serviceWorker: {
        url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      },
      onUnhandledFrame: 'bypass',
    })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

startApp().catch((error: unknown) => {
  console.error('Failed to initialize the application.', error)
  document.getElementById('root')!.textContent =
    'Unable to start the application. Please reload the page.'
})
