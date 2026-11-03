import { useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Producto } from './tipos.ts';
import { pesos } from './datos.ts';
import { Cantidad } from './Cantidad.tsx';
import { Foto } from './Foto.tsx';

interface Props { p: Producto; n: number; cambiar: (n: number) => void; cerrar: () => void; verCarrito: () => void }

/** Al tocar un producto: foto grande, precio, descripción y agregar (como la ficha del D1). */
export function DetalleProducto({ p, n, cambiar, cerrar, verCarrito }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    caja.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [cerrar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end min-[700px]:items-center justify-center">
      <div className="absolute inset-0 bg-[#1F2933]/50" onClick={cerrar} aria-hidden="true" />
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-label={p.nombre}
        className="hoja-sube relative bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[5px] min-[700px]:rounded-[5px] outline-none">
        <button type="button" onClick={cerrar} aria-label="Cerrar"
          className="absolute top-2 right-2 z-10 w-12 h-12 flex items-center justify-center rounded-[5px] bg-white/90 text-[#5B6670]">
          <X size={22} />
        </button>
        <div className="min-[700px]:grid min-[700px]:grid-cols-2 min-[700px]:gap-6 p-4 min-[700px]:p-6">
          <Foto src={p.foto} alt={p.nombre} gris={!p.disponible} className="aspect-square rounded-[5px] border border-[#E3E7EC]" />
          <div className="mt-4 min-[700px]:mt-2 flex flex-col">
            {p.categoria && (
              <p className="flex items-center gap-1 text-[13px] text-[#5B6670]">
                Tienda <ChevronRight size={14} aria-hidden="true" /> {p.categoria}
              </p>
            )}
            {p.marca && <p className="mt-2 text-[12px] uppercase tracking-wide text-[#5B6670]">{p.marca}</p>}
            <h2 className="font-poppins font-semibold text-[20px] leading-snug text-[#003A73] mt-1 pr-10 min-[700px]:pr-0">{p.nombre}</h2>
            <p className="font-poppins font-bold text-[26px] mt-2">{pesos(p.precio)}</p>
            {p.descripcion && (
              <div className="mt-3 border-t border-[#E3E7EC] pt-3">
                <h3 className="font-poppins font-semibold text-[14px] mb-1">Descripción</h3>
                <p className="text-[14px] text-[#1F2933] whitespace-pre-line">{p.descripcion}</p>
              </div>
            )}
            <div className="mt-5 min-[700px]:mt-auto pt-2">
              {!p.disponible ? (
                <p className="h-14 flex items-center justify-center text-[#B03030] font-poppins font-semibold border border-[#E3E7EC] rounded-[5px]">
                  Agotado por ahora</p>
              ) : n === 0 ? (
                <button type="button" onClick={() => cambiar(1)}
                  className="w-full h-14 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold text-[16px]">
                  Agregar al carrito</button>
              ) : (
                <div className="space-y-2">
                  <Cantidad n={n} nombre={p.nombre} cambiar={cambiar} grande />
                  <p className="text-[14px] text-[#5B6670] text-center">En tu carrito: {pesos(p.precio * n)}</p>
                  <button type="button" onClick={verCarrito}
                    className="w-full h-14 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold text-[16px]">
                    Ver carrito</button>
                  <button type="button" onClick={cerrar}
                    className="w-full h-12 rounded-[5px] border border-[#005198] text-[#005198] font-poppins font-semibold">
                    Seguir comprando</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
