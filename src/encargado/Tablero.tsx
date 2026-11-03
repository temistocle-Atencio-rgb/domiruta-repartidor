import { useMemo, useState } from 'react';
import { Bike, CheckSquare, Square } from 'lucide-react';
import { Store } from '../iconos/Icono';
import { Tablero as TTablero, PedidoE, Columna, columna, hace, MEDIO, pagaAntes } from './datos.ts';
import { pesos } from '../tienda/datos.ts';
import { Asignar } from './Asignar.tsx';

const COLUMNAS: { id: Columna; titulo: string; ayuda: string }[] = [
  { id: 'nuevos', titulo: 'Nuevos', ayuda: 'Acéptalos o cancélalos' },
  { id: 'pagar', titulo: 'Por pagar', ayuda: 'Esperando el comprobante' },
  { id: 'empacar', titulo: 'Empacando', ayuda: 'Marca cada producto' },
  { id: 'listos', titulo: 'Listos', ayuda: 'Asigna el domiciliario' },
  { id: 'camino', titulo: 'En camino', ayuda: 'Con el domiciliario o por recoger' },
];

interface Props { datos: TTablero; abrir: (id: number) => void; recargar: () => void }

export function Tablero({ datos, abrir, recargar }: Props) {
  const [col, setCol] = useState<Columna>('nuevos');
  const [elegidos, setElegidos] = useState<number[]>([]);
  const [asignando, setAsignando] = useState(false);
  const grupos = useMemo(() => {
    const g: Record<Columna, PedidoE[]> = { nuevos: [], pagar: [], empacar: [], listos: [], camino: [] };
    for (const p of datos.pedidos) { const c = columna(p); if (c) g[c].push(p); }
    return g;
  }, [datos]);
  // lo que estaba elegido y ya salió de «Listos» se suelta solo
  const elegidosVivos = elegidos.filter((id) => grupos.listos.some((p) => p.id === id && p.entrega === 'domicilio'));
  const enCola = datos.trabajos.filter((t) => t.tipo === 'asignar' && t.estado === 'pendiente').flatMap((t) => t.datos.pedidos ?? []);
  const errores = datos.trabajos.filter((t) => t.estado === 'error').slice(0, 3);

  const tarjeta = (p: PedidoE, c: Columna) => {
    const elegible = c === 'listos' && p.entrega === 'domicilio' && !enCola.includes(p.id);
    const marcado = elegidosVivos.includes(p.id);
    return (
      <article key={p.id} className={`bg-white rounded-[5px] border ${marcado ? 'border-[#005198] border-2' : 'border-[#E3E7EC]'} flex`}>
        {elegible && (
          <button type="button" aria-pressed={marcado} aria-label={`Elegir el pedido de ${p.nombre} para asignar`}
            onClick={() => setElegidos((e) => marcado ? e.filter((x) => x !== p.id) : [...e, p.id])}
            className="w-11 shrink-0 flex items-start justify-center pt-3 text-[#005198]">
            {marcado ? <CheckSquare size={22} /> : <Square size={22} />}
          </button>
        )}
        <button type="button" onClick={() => abrir(p.id)} className={`flex-1 text-left p-3 ${elegible ? 'pl-0' : ''} rounded-[5px] min-w-0`}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-poppins font-semibold text-[15px] text-[#003A73] truncate">{p.nombre}</p>
            <p className="font-poppins font-semibold text-[14px] shrink-0">{pesos(p.total)}</p>
          </div>
          <p className="text-[12px] text-[#5B6670] mt-0.5">#{p.codigo} · {hace(p.creado)}</p>
          <p className="text-[13px] mt-1.5 flex items-center gap-1.5">
            {p.entrega === 'domicilio' ? <Bike size={15} className="text-[#005198] shrink-0" /> : <Store size={15} className="text-[#005198] shrink-0" />}
            <span className="truncate">{p.entrega === 'domicilio' ? p.direccion : 'Lo recoge en la tienda'}</span>
          </p>
          <p className="text-[13px] text-[#5B6670] mt-0.5">
            {(() => { const n = p.items.reduce((s, i) => s + i.cantidad, 0); return n === 1 ? '1 producto' : n + ' productos'; })()} · {MEDIO[p.pago] ?? p.pago}
            {pagaAntes(p) && (p.pagado ? <span className="text-[#1E7A44] font-medium"> · pagado</span>
              : p.comprobante ? <span className="text-[#8A4B00] font-medium"> · llegó el comprobante</span> : null)}
          </p>
          {p.faltantes.length > 0 && <p className="text-[12px] text-[#B03030] mt-0.5">Faltan {p.faltantes.length} producto(s)</p>}
          {enCola.includes(p.id) && <p className="text-[12px] text-[#005198] font-medium mt-0.5">Saliendo: la caja arma la ruta…</p>}
        </button>
      </article>
    );
  };

  return (
    <div className="px-3 min-[1100px]:px-4 py-3 min-[1100px]:py-4">
      {errores.length > 0 && (
        <div className="mb-3 bg-white border border-[#B03030] rounded-[5px] p-3 text-[14px] text-[#B03030]">
          {errores.map((t) => <p key={t.id}>La caja no pudo {t.tipo === 'asignar' ? 'sacar la salida' : t.tipo === 'vender' ? 'registrar la venta' : 'imprimir'}: {t.resultado}</p>)}
        </div>
      )}
      {/* en el celular: pestañas; en el computador: las 5 columnas */}
      <nav className="min-[1100px]:hidden flex overflow-x-auto sin-barra bg-white rounded-[5px] border border-[#E3E7EC] mb-3" aria-label="Columnas">
        {COLUMNAS.map((c) => (
          <button key={c.id} type="button" onClick={() => setCol(c.id)} aria-pressed={col === c.id}
            className={`shrink-0 h-12 px-3 font-poppins text-[14px] border-b-[3px] ${col === c.id ? 'border-[#005198] text-[#003A73] font-semibold' : 'border-transparent text-[#5B6670] font-medium'}`}>
            {c.titulo} ({grupos[c.id].length})
          </button>
        ))}
      </nav>
      <div className="grid min-[1100px]:grid-cols-5 gap-3 items-start">
        {COLUMNAS.map((c) => (
          <section key={c.id} className={`${col === c.id ? '' : 'hidden'} min-[1100px]:block bg-[#E9EDF2] rounded-[5px] p-2.5`} aria-label={c.titulo}>
            <header className="px-1 pb-2">
              <h2 className="font-poppins font-semibold text-[15px] text-[#003A73]">{c.titulo} <span className="text-[#5B6670] font-medium">({grupos[c.id].length})</span></h2>
              <p className="text-[12px] text-[#5B6670]">{c.ayuda}</p>
            </header>
            <div className="space-y-2">
              {grupos[c.id].length === 0 && <p className="text-[13px] text-[#5B6670] px-1 py-4 text-center">Nada por aquí</p>}
              {grupos[c.id].map((p) => tarjeta(p, c.id))}
            </div>
            {c.id === 'listos' && elegidosVivos.length > 0 && (
              <button type="button" onClick={() => setAsignando(true)}
                className="mt-3 w-full h-12 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold">
                Asignar domiciliario ({elegidosVivos.length})
              </button>
            )}
          </section>
        ))}
      </div>
      {asignando && <Asignar pedidos={elegidosVivos} datos={datos} cerrar={() => setAsignando(false)}
        listo={() => { setAsignando(false); setElegidos([]); recargar(); }} />}
    </div>
  );
}
