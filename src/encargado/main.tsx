import { createRoot } from 'react-dom/client';
import { Encargado } from './Encargado.tsx';
import '../index.css';
import '../tienda/tienda.css';
import { registrarApp } from '../utils/instalar.ts';

createRoot(document.getElementById('root')!).render(<Encargado />);
registrarApp(); // se puede instalar como app aparte
