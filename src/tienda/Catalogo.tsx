import { useMemo, useState } from 'react';
import { X, Clock, Bike, MapPin } from 'lucide-react';
import { Search, ShoppingCart, Store } from '../iconos/Icono';
import { Catalogo as TCatalogo, Carrito, Producto } from './tipos.ts';
import { pesos, sinTildes } from './datos.ts';
import { Cantidad } from './Cantidad.tsx';
import { Foto } from './Foto.tsx';
import { Pie } from './Pie.tsx';
import { PaginaProducto } from './PaginaProducto.tsx';

interface Props {
  catalogo: TCatalogo;
  carrito: Carrito;
  cambiar: (id: number, n: number) => void;
  abrirCarrito: () => void;
  subtotal: number;
  unidades: number;
  verProducto: (p: Producto) => void;
  /** El producto abierto (su ficha va en lugar de la lista) */
  producto: Producto | null;
  cerrarProducto: () => void;
}

export function Catalogo({ catalogo, carrito, cambiar, abrirCarrito, subtotal, unidades, verProducto, producto, cerrarProducto }: Props) {
  const { tienda, productos } = catalogo;
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');

  const categorias = useMemo(() => {
    const vistas = new Set<string>();
    for (const p of productos) if (p.categoria) vistas.add(p.categoria);
    return [...vistas];
  }, [productos]);

  const lista = useMemo(() => {
    // «cocacola» encuentra «Coca-Cola»: se comparan solo letras y números
    const q = sinTildes(buscar).replace(/[^a-z0-9]/g, '');
    return productos.filter((p) =>
      (!categoria || p.categoria === categoria) &&
      (!q || sinTildes(`${p.nombre} ${p.descripcion} ${p.marca} ${p.categoria}`).replace(/[^a-z0-9]/g, '').includes(q)));
  }, [productos, buscar, categoria]);

  // Si busca, se ven todos juntos; si no, agrupados por categoría como en el estante
  const grupos = useMemo(() => {
    if (buscar.trim() || categoria) return [{ nombre: '', items: lista }];
    const m = new Map<string, Producto[]>();
    for (const p of lista) {
      const k = p.categoria || 'Otros';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m].map(([nombre, items]) => ({ nombre, items }));
  }, [lista, buscar, categoria]);

  return (
    <div className="min-h-screen pb-28">
      {/* Barra de arriba */}
      <header className="bg-[#003A73] text-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 min-[900px]:flex-nowrap min-[900px]:gap-6">
          {/* en el celular: tienda y carrito arriba, buscador abajo; en el computador: los tres en una línea (como el D1) */}
          <div className="order-1 flex-1 min-[900px]:flex-none min-[900px]:max-w-xs flex items-center gap-3 min-w-0">
            {tienda.logo
              ? <img src={tienda.logo} alt="" className="w-11 h-11 min-[900px]:w-12 min-[900px]:h-12 object-contain shrink-0" />
              : <Store size={28} className="text-white shrink-0" aria-hidden="true" />}
            <div className="min-w-0">
              <h1 className="font-poppins font-semibold text-[17px] min-[900px]:text-[19px] leading-tight truncate">{tienda.nombre || 'Tienda en línea'}</h1>
              <p className={`text-[13px] font-medium ${tienda.abierta ? 'text-[#9FE0B8]' : 'text-[#FFC9C9]'}`}>
                {tienda.abierta ? 'Abierta ahora' : 'Cerrada ahora'}
              </p>
            </div>
          </div>
          <label className="order-3 w-full min-[900px]:order-2 min-[900px]:w-auto min-[900px]:flex-1 flex items-center gap-2 h-12 bg-white rounded-[5px] px-3 text-[#1F2933] focus-within:outline focus-within:outline-2 focus-within:outline-[#9CC3E8]">
            <Search size={20} className="text-[#5B6670] shrink-0" aria-hidden="true" />
            <input type="search" value={buscar} onChange={(e) => { setBuscar(e.target.value); if (producto) cerrarProducto(); }}
              placeholder="¿Qué estás buscando?" aria-label="Buscar productos" enterKeyHint="search"
              className="flex-1 min-w-0 bg-transparent outline-none text-[16px] placeholder:text-[#7B8794]" />
            {buscar && (
              <button type="button" onClick={() => setBuscar('')} aria-label="Borrar la búsqueda"
                className="w-10 h-10 -mr-2 flex items-center justify-center text-[#5B6670]"><X size={18} /></button>
            )}
          </label>
          <button type="button" onClick={abrirCarrito}
            aria-label={`Carrito: ${unidades} productos, ${pesos(subtotal)}`}
            className="order-2 min-[900px]:order-3 h-12 px-3 min-[900px]:px-4 rounded-[5px] bg-white text-[#003A73] flex items-center gap-2 shrink-0">
            <span className="relative">
              <ShoppingCart size={22} />
              {unidades > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-5 h-5 px-1 rounded-[5px] bg-[#005198] text-white text-[11px] font-semibold flex items-center justify-center">
                  {unidades > 99 ? '99+' : unidades}
                </span>
              )}
            </span>
            <span className="font-poppins font-semibold text-[14px] hidden min-[380px]:inline">{pesos(subtotal)}</span>
            <span className="hidden min-[900px]:inline text-[13px] text-[#5B6670]">· Carrito</span>
          </button>
        </div>
      {/* Categorías */}
      {categorias.length > 1 && (
        <nav aria-label="Categorías" className="bg-white border-b border-[#E3E7EC] text-[#1F2933]">
          <div className="max-w-7xl mx-auto flex overflow-x-auto sin-barra px-2 min-[900px]:gap-2">
            {['', ...categorias].map((c) => {
              const activa = categoria === c;
              return (
                <button key={c || 'todo'} type="button" onClick={() => { setCategoria(c); if (producto) cerrarProducto(); window.scrollTo({ top: 0 }); }}
                  aria-pressed={activa && !producto}
                  className={`shrink-0 h-12 px-3 font-poppins text-[14px] border-b-[3px] ${activa
                    ? 'border-[#005198] text-[#003A73] font-semibold' : 'border-transparent text-[#5B6670] font-medium'}`}>
                  {c || 'Todo'}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      </header>

      {!tienda.abierta && (
        <div className="bg-[#FDEBD3] text-[#8A4B00] text-[14px] font-medium px-4 py-3 text-center">
          La tienda está cerrada ahora{tienda.horario ? ` · atiende ${tienda.horario}` : ''}. Puedes mirar, pero todavía no recibe pedidos.
        </div>
      )}

      {/* Datos de la tienda, como la ficha de un restaurante */}
      <div className="bg-white border-b border-[#E3E7EC]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-[#5B6670]">
          <span className="flex items-center gap-1.5"><Bike size={16} className="text-[#005198]" />
            Domicilio {tienda.domicilio > 0 ? pesos(tienda.domicilio) : 'gratis'}</span>
          {tienda.minimo > 0 && <span className="flex items-center gap-1.5"><ShoppingCart size={16} className="text-[#005198]" />
            Pedido mínimo {pesos(tienda.minimo)}</span>}
          {tienda.horario && <span className="flex items-center gap-1.5"><Clock size={16} className="text-[#005198]" />{tienda.horario}</span>}
          {tienda.direccion && <span className="flex items-center gap-1.5"><MapPin size={16} className="text-[#005198]" />{tienda.direccion}</span>}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 min-[900px]:px-4 pt-3 min-[900px]:pt-6">
        {producto && (
          <PaginaProducto p={producto} n={carrito[producto.id] || 0} cambiar={(n) => cambiar(producto.id, n)}
            verCarrito={abrirCarrito} carrito={carrito} cambiarOtro={cambiar} verProducto={verProducto} Tarjeta={Tarjeta}
            volver={(cat) => { setCategoria(cat ?? ''); setBuscar(''); cerrarProducto(); }}
            parecidos={productos.filter((x) => x.id !== producto.id && x.categoria === producto.categoria && x.disponible).slice(0, 6)} />
        )}
        {!producto && productos.length === 0 && (
          <p className="text-center text-[#5B6670] py-16 px-6">La tienda todavía no tiene productos en línea. Vuelve más tarde.</p>
        )}
        {!producto && productos.length > 0 && lista.length === 0 && (
          <div className="text-center py-14 px-6">
            <p className="font-poppins font-semibold text-[16px]">No encontramos «{buscar}»</p>
            <p className="text-[#5B6670] text-[14px] mt-1">Prueba con otra palabra o mira todas las categorías.</p>
            <button type="button" onClick={() => { setBuscar(''); setCategoria(''); }}
              className="mt-4 h-12 px-5 rounded-[5px] border border-[#005198] text-[#005198] font-poppins font-semibold">Ver todo</button>
          </div>
        )}
        {!producto && grupos.map((g) => (
          <section key={g.nombre || 'todos'} className="mb-5">
            {g.nombre && <h2 className="font-poppins font-semibold text-[17px] text-[#003A73] px-1 mb-2">{g.nombre}</h2>}
            <div className="grid grid-cols-2 min-[600px]:grid-cols-3 min-[900px]:grid-cols-4 min-[1150px]:grid-cols-5 min-[1450px]:grid-cols-6 gap-2.5 min-[900px]:gap-4">
              {g.items.map((p) => (
                <Tarjeta key={p.id} p={p} n={carrito[p.id] || 0} cambiar={(n) => cambiar(p.id, n)} ver={() => verProducto(p)} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <Pie tienda={tienda} />

      {/* El único botón naranja de esta pantalla */}
      {unidades > 0 && !producto && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E3E7EC] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={abrirCarrito}
            className="max-w-7xl mx-auto w-full h-14 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold text-[16px] flex items-center justify-between px-4">
            <span>Ver carrito ({unidades})</span>
            <span>{pesos(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Tarjeta({ p, n, cambiar, ver }: { p: Producto; n: number; cambiar: (n: number) => void; ver: () => void }) {
  return (
    <article className="bg-white rounded-[5px] border border-[#E3E7EC] p-2.5 flex flex-col hover:border-[#9CC3E8]">
      {/* foto y nombre abren la ficha del producto */}
      <button type="button" onClick={ver} aria-label={`Ver ${p.nombre}`} className="text-left rounded-[5px] flex flex-col">
        <Foto src={p.foto} alt={p.nombre} gris={!p.disponible} className="aspect-square rounded-[5px] w-full" />
        {p.marca && <p className="mt-2 text-[12px] text-[#5B6670] truncate">{p.marca}</p>}
        <h3 className={`${p.marca ? '' : 'mt-2'} text-[14px] leading-snug line-clamp-2 min-h-[2.6em]`}>{p.nombre}</h3>
        {p.descripcion && <p className="text-[12px] text-[#5B6670] line-clamp-1">{p.descripcion}</p>}
        <p className="font-poppins font-bold text-[17px] mt-1 mb-2">{pesos(p.precio)}</p>
      </button>
      <div className="mt-auto">
        {!p.disponible
          ? <p className="h-11 flex items-center justify-center text-[#B03030] font-poppins font-semibold text-[14px]">Agotado</p>
          : n === 0
            ? <button type="button" onClick={() => cambiar(1)} aria-label={`Agregar ${p.nombre}`}
                className="w-full h-11 min-[900px]:h-10 rounded-[5px] bg-[#005198] text-white font-poppins font-semibold text-[14px]">Agregar</button>
            : <Cantidad n={n} nombre={p.nombre} cambiar={cambiar} />}
      </div>
    </article>
  );
}
