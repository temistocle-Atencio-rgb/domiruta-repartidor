import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Registrar Service Worker para PWA (ruta relativa ./sw.js para subdirectorios en GitHub Pages)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('No se pudo registrar el Service Worker:', err);
    });
  });
}
