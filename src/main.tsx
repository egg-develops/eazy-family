import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { Capacitor } from '@capacitor/core'

// Catch unhandled JS errors and show them on screen (temporary diagnostic)
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() === '') {
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#a00;background:#fff;font-size:13px;word-break:break-word">
      <b>JS Error:</b><br>${e.message}<br><br>
      <b>Source:</b> ${e.filename}:${e.lineno}<br><br>
      <b>Stack:</b><br>${e.error?.stack ?? 'none'}
    </div>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() === '') {
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#a00;background:#fff;font-size:13px;word-break:break-word">
      <b>Unhandled Promise:</b><br>${String(e.reason)}
    </div>`;
  }
});

// Register service worker for web PWA only — skip on native (Capacitor's https://localhost bridge conflicts with SW fetch interception on Android)
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// iOS: scroll focused input into view when keyboard appears
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const el = document.activeElement as HTMLElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
// Fresh build Mon Mar 23 13:13:46 CET 2026
// Database migration complete - Mon Mar 30 12:52:42 CEST 2026
