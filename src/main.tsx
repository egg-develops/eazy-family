import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { Capacitor } from '@capacitor/core'

// On native, unregister any previously installed service workers (legacy cleanup)
// and skip registration — SW fetch interception conflicts with Capacitor's https://localhost bridge on Android
if ('serviceWorker' in navigator && Capacitor.isNativePlatform()) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

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
