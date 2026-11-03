import { createRoot } from 'react-dom/client';
import { Tienda } from './Tienda.tsx';
import '../index.css';
import './tienda.css';

createRoot(document.getElementById('root')!).render(<Tienda />);
