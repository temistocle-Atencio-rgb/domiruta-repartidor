import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ShoppingCart } from '../iconos/Icono';
import { Producto, Tienda, Carrito as TCarrito } from './tipos.ts';
import { pesos } from './datos.ts';
import { Cantidad } from './Cantidad.tsx';
import { Foto } from './Foto.tsx';

interface Props {
  tienda: Tienda;
  lineas: { p: Producto; n: number }[];
  carrito: TCarrito;
  cambiar: (id: number, n: number) => void;
  vaciar: () => void;
  cerrar: () => void;
  continuar: () => void;
  subtotal: number;
}

/** Hoja que sube desde abajo con lo que lleva */
export function Carrito({ tienda, lineas, cambiar, vaciar, cerrar, continuar, subtotal }: Props) {
  const hoja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    hoja.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [cerrar]);

  const agotados = lineas.filter((l) => !l.p.disponible);
  const falta = Math.max(0, tienda.minimo - subtotal);
  const total = subtotal + tienda.domicilio;
  const puede = lineas.length > 0 && falta === 0 && agotados.length === 0 && tienda.abierta;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-[#1F2933]/50" onClick={cerrar} aria-hidden="true" />
      <div ref={hoja} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Tu carrito"
        className="hoja-sube relative bg-[#F2F4F7] w-full max-w-lg max-h-[88vh] rounded-t-[5px] flex flex-col outline-none">
        <div className="flex items-center justify-between px-4 h-14 bg-white rounded-t-[5px] border-b border-[#E3E7EC]">
          <h2 className="font-poppins font-semibold text-[18px]">Tu carrito</h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar el carrito"
            className="w-12 h-12 -mr-3 flex items-center justify-center text-[#5B6670]"><X size={22} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3">
          {lineas.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={40} className="mx-auto text-[#9AA5B1]" />
              <p className="mt-3 text-[#5B6670]">Tu carrito está vacío.</p>
              <button type="button" onClick={cerrar}
                className="mt-4 h-12 px-5 rounded-[5px] border border-[#005198] text-[#005198] font-poppins font-semibold">Ver productos</button>
            </div>
          ) : (
            <>
              <ul className="bg-white rounded-[5px] border border-[#E3E7EC] divide-y divide-[#E3E7EC]">
                {lineas.map(({ p, n }) => (
                  <li key={p.id} className="flex gap-3 p-3">
                    <Foto src={p.foto} alt="" gris={!p.disponible} className="w-16 h-16 rounded-[5px] border border-[#E3E7EC] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] leading-snug line-clamp-2">{p.nombre}</p>
                      {p.disponible
                        ? <p className="text-[12px] text-[#5B6670]">{pesos(p.precio)} c/u</p>
                        : <p className="text-[13px] text-[#B03030] font-medium">Se agotó: quítalo para seguir</p>}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="w-32"><Cantidad n={n} nombre={p.nombre} cambiar={(m) => cambiar(p.id, m)} /></div>
                        <p className="font-poppins font-semibold text-[15px]">{pesos(p.precio * n)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={vaciar}
                className="mt-2 h-11 px-2 text-[#B03030] text-[14px] font-medium">Vaciar el carrito</button>
            </>
          )}
        </div>

        {lineas.length > 0 && (
          <div className="bg-white border-t border-[#E3E7EC] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <dl className="text-[14px] space-y-1">
              <div className="flex justify-between"><dt className="text-[#5B6670]">Productos</dt><dd>{pesos(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#5B6670]">Domicilio</dt>
                <dd>{tienda.domicilio > 0 ? pesos(tienda.domicilio) : 'Gratis'}</dd></div>
              <div className="flex justify-between font-poppins font-semibold text-[17px] pt-1"><dt>Total</dt><dd>{pesos(total)}</dd></div>
            </dl>
            {falta > 0 && <p className="mt-2 text-[13px] text-[#8A4B00] font-medium">
              El pedido mínimo es de {pesos(tienda.minimo)}. Te faltan {pesos(falta)}.</p>}
            {!tienda.abierta && <p className="mt-2 text-[13px] text-[#8A4B00] font-medium">La tienda está cerrada ahora.</p>}
            <button type="button" onClick={continuar} disabled={!puede}
              className="mt-3 w-full h-14 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold text-[16px] disabled:bg-[#E3E7EC] disabled:text-[#5B6670]">
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
