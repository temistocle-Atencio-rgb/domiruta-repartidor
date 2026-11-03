import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Producto } from './tipos.ts';
import { pesos } from './datos.ts';
import { Cantidad } from './Cantidad.tsx';
import { Foto } from './Foto.tsx';

interface Props {
  p: Producto;
  n: number;
  cambiar: (n: number) => void;
  verCarrito: () => void;
  volver: (categoria?: string) => void;
  parecidos: Producto[];
  carrito: Record<number, number>;
  cambiarOtro: (id: number, n: number) => void;
  verProducto: (p: Producto) => void;
  Tarjeta: (x: { p: Producto; n: number; cambiar: (n: number) => void; ver: () => void }) => React.ReactNode;
}

/** La ficha del producto, con la misma estructura del D1: ruta, foto, precio, descripción y características. */
export function PaginaProducto({ p, n, cambiar, verCarrito, volver, parecidos, carrito, cambiarOtro, verProducto, Tarjeta }: Props) {
  const zonaBoton = useRef<HTMLDivElement>(null);
  const [barra, setBarra] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [p.id]);
  // la barra de abajo sale cuando el botón de agregar ya no se ve (como en el D1)
  useEffect(() => {
    const z = zonaBoton.current;
    if (!z || typeof IntersectionObserver === 'undefined') return;
    const o = new IntersectionObserver(([e]) => setBarra(!e.isIntersecting && e.boundingClientRect.top < 0));
    o.observe(z);
    return () => o.disconnect();
  }, [p.id]);

  const caracts = (p.caracteristicas ?? []).filter((c) => c.n && c.v);
  const comprar = (grande: boolean) => !p.disponible ? (
    <p className={`${grande ? 'h-14' : 'h-12'} px-4 flex items-center justify-center text-[#B03030] font-poppins font-semibold border border-[#E3E7EC] rounded-[5px] bg-white`}>
      Agotado por ahora</p>
  ) : n === 0 ? (
    <button type="button" onClick={() => cambiar(1)}
      className={`w-full ${grande ? 'h-14 text-[16px]' : 'h-12 text-[15px]'} px-5 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold`}>
      Agregar al carrito</button>
  ) : (
    <div className={`flex gap-2 ${grande ? 'flex-col' : ''}`}>
      <div className={grande ? '' : 'w-36'}><Cantidad n={n} nombre={p.nombre} cambiar={cambiar} grande={grande} /></div>
      <button type="button" onClick={verCarrito}
        className={`${grande ? 'h-14 text-[16px]' : 'h-12 text-[15px] px-5'} rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold`}>
        Ver carrito · {pesos(p.precio * n)}</button>
    </div>
  );

  return (
    <div className="pb-24">
      {/* Inicio › Categoría › Producto */}
      <nav aria-label="Estás en" className="flex flex-wrap items-center gap-1 text-[14px] text-[#5B6670] py-3 min-[900px]:py-5">
        <button type="button" onClick={() => volver()} className="flex items-center gap-1 min-h-11 px-1 rounded-[5px] text-[#005198]">
          <Home size={17} aria-hidden="true" />Inicio</button>
        {p.categoria && <>
          <ChevronRight size={16} aria-hidden="true" />
          <button type="button" onClick={() => volver(p.categoria)} className="min-h-11 px-1 rounded-[5px] text-[#005198]">{p.categoria}</button>
        </>}
        <ChevronRight size={16} aria-hidden="true" />
        <span className="text-[#1F2933] truncate max-w-[60vw]" aria-current="page">{p.nombre}</span>
      </nav>

      <div className="grid gap-5 min-[900px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[900px]:gap-8 items-start">
        <div className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 min-[900px]:p-8">
          <Foto src={p.foto} alt={p.nombre} gris={!p.disponible} className="aspect-square max-h-[520px] mx-auto w-full" />
        </div>
        <div className="bg-white rounded-[5px] border border-[#E3E7EC] p-5 min-[900px]:p-7 min-[900px]:sticky min-[900px]:top-28">
          {p.marca && <p className="text-[13px] uppercase tracking-wide text-[#5B6670]">{p.marca}</p>}
          <h2 className="font-poppins font-semibold text-[22px] min-[900px]:text-[26px] leading-snug text-[#003A73] mt-1">{p.nombre}</h2>
          {p.codigo && <p className="text-[13px] text-[#5B6670] mt-2">Código: {p.codigo}</p>}
          <p className="font-poppins font-bold text-[28px] min-[900px]:text-[32px] mt-3">{pesos(p.precio)}</p>
          {p.descripcion.startsWith('Precio por') && (
            <p className="text-[14px] text-[#5B6670]">{p.descripcion.split(' · ')[0]}</p>
          )}
          <div ref={zonaBoton} className="mt-5">{comprar(true)}</div>
        </div>
      </div>

      {/* Descripción del producto (como la pestaña del D1) */}
      <section className="mt-8 bg-white rounded-[5px] border border-[#E3E7EC]">
        <h2 className="inline-block font-poppins font-semibold text-[16px] text-[#003A73] px-5 pt-4 pb-3 border-b-[3px] border-[#005198]">
          Descripción del producto</h2>
        <div className="border-t border-[#E3E7EC] p-5 min-[900px]:p-7 space-y-5 text-[15px]">
          <p className="font-poppins font-semibold text-[18px]">Nombre del producto: {p.nombre}</p>
          {p.descripcion && !(p.descripcion.startsWith('Precio por') && !p.descripcion.includes(' · ')) && (
            <div>
              <h3 className="font-poppins font-semibold text-[15px] mb-1">Descripción del producto:</h3>
              <p className="whitespace-pre-line">{p.descripcion.startsWith('Precio por') ? p.descripcion.split(' · ').slice(1).join(' · ') : p.descripcion}</p>
            </div>
          )}
          <div>
            <h3 className="font-poppins font-semibold text-[15px] mb-1">Características del producto:</h3>
            <ul className="list-disc pl-6 space-y-1">
              {caracts.map((c, i) => <li key={i}><span className="font-semibold">{c.n}:</span> {c.v}</li>)}
              {p.categoria && <li><span className="font-semibold">Categoría:</span> {p.categoria}</li>}
              {p.descripcion.startsWith('Precio por') && <li><span className="font-semibold">Se vende:</span> {p.descripcion.startsWith('Precio por libra') ? 'por libra' : 'por kilo'}</li>}
              <li><span className="font-semibold">Disponible:</span> {p.disponible ? 'Sí' : 'Agotado por ahora'}</li>
            </ul>
          </div>
          <p className="text-[13px] text-[#5B6670]">Las fotos son de referencia. Si tienes dudas sobre el producto, escríbele a la tienda.</p>
        </div>
      </section>

      {parecidos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-poppins font-semibold text-[18px] text-[#003A73] mb-3">Más de {p.categoria}</h2>
          <div className="grid grid-cols-2 min-[600px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1150px]:grid-cols-5 min-[1450px]:grid-cols-6 gap-2.5 min-[900px]:gap-4">
            {parecidos.map((x) => <Tarjeta key={x.id} p={x} n={carrito[x.id] || 0} cambiar={(m) => cambiarOtro(x.id, m)} ver={() => verProducto(x)} />)}
          </div>
        </section>
      )}

      {barra && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E3E7EC] shadow-[0_-4px_12px_rgba(31,41,51,0.08)] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-poppins font-semibold truncate">{p.nombre}</p>
              <p className="font-poppins font-bold text-[17px]">{pesos(p.precio)}</p>
            </div>
            <div className="shrink-0">{comprar(false)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
