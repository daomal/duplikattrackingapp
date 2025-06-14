
import { createRoot } from 'react-dom/client';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import App from './App.tsx';
import './index.css';

// Call this to initialize the PWA elements needed for Capacitor
defineCustomElements(window);

// Initialize the app with error handling
const startApp = () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error("Root element not found");
      return;
    }
    
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error("Failed to start the application:", error);
    
    // Show fallback UI if rendering fails
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <h1 style="color: #e11d48;">Aplikasi Gagal Dimuat</h1>
          <p>Mohon muat ulang halaman atau hubungi administrator.</p>
          <button 
            style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-top: 20px; cursor: pointer;"
            onclick="window.location.reload()"
          >
            Muat Ulang
          </button>
        </div>
      `;
    }
  }
};

// Wait for the device to be ready when using Capacitor
if (typeof window !== 'undefined' && 'cordova' in window) {
  document.addEventListener('deviceready', startApp, false);
} else {
  startApp();
}
