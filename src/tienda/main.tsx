import { createRoot } from 'react-dom/client';
import { Tienda } from './Tienda.tsx';
import '../index.css';
import './tienda.css';
import { registrarApp } from '../utils/instalar.ts';

createRoot(document.getElementById('root')!).render(<Tienda />);
registrarApp(); // se puede instalar como app aparte
