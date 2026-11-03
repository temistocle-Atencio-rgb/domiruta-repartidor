// Iconos propios de DomiRuta (carpeta ICONO). Se pintan con el color del texto (currentColor),
// asi que text-[#005198] y demas clases funcionan igual que antes.
import type { CSSProperties } from 'react';
import buscar from './svg/buscar.svg';
import carrito from './svg/carrito.svg';
import tienda from './svg/tienda.svg';
import basura from './svg/basura.svg';
import recibo from './svg/recibo.svg';
import foto from './svg/foto.svg';
import caja from './svg/caja.svg';
import copiar from './svg/copiar.svg';
import listo from './svg/listo.svg';

type Props = { size?: number; className?: string; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' | 'false' };

function hacer(url: string) {
  return function Icono({ size, className = '', 'aria-hidden': oculto = true }: Props) {
    const estilo: CSSProperties = {
      backgroundColor: 'currentColor',
      WebkitMask: `url("${url}") center / contain no-repeat`,
      mask: `url("${url}") center / contain no-repeat`,
      ...(size ? { width: size, height: size } : {}),
    };
    const tam = size || /\b(w-|h-)/.test(className) ? '' : 'w-6 h-6';
    return <span aria-hidden={oculto} className={`inline-block shrink-0 ${tam} ${className}`} style={estilo} />;
  };
}

export const Search = hacer(buscar);
export const ShoppingCart = hacer(carrito);
export const Store = hacer(tienda);
export const Trash2 = hacer(basura);
export const ReceiptText = hacer(recibo);
export const Camera = hacer(foto);
export const Package = hacer(caja);
export const Copy = hacer(copiar);
export const CheckCircle2 = hacer(listo);
