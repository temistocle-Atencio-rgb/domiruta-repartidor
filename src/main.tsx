import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registrarApp } from './utils/instalar.ts';

createRoot(document.getElementById('root')!).render(<App />);

// sin service worker Chrome no ofrece instalar la app
registrarApp();
