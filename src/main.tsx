import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Guard against unhandled rejections and benign runtime errors in sandbox environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason?.message || (typeof reason === 'string' ? reason : '') || reason?.toString?.() || '';

    // Prevent benign network, HMR, WebSocket, or abort rejections from crashing the app
    if (
      !reason ||
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('websocket') ||
      reasonStr.includes('vite') ||
      reasonStr.includes('ResizeObserver') ||
      reasonStr.includes('canceled') ||
      reasonStr.includes('aborted') ||
      reasonStr.includes('Failed to fetch')
    ) {
      event.preventDefault();
      return;
    }

    console.warn('[Handled Global Promise Rejection]:', reason);
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      !msg ||
      msg.includes('ResizeObserver loop') ||
      msg.includes('Script error') ||
      msg.includes('WebSocket')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

