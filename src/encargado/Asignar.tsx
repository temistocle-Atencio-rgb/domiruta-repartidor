import { useState } from 'react';
import { X } from 'lucide-react';
import { Tablero, asignar } from './datos.ts';

export function Asignar({ pedidos, datos, cerrar, listo }: { pedidos: number[]; datos: Tablero; cerrar: () => void; listo: () => void }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState('');
  const elegir = async (id: string) => {
    setEnviando(id);
    setError('');
    try {
      const r = await asignar(pedidos, id);
      if (r) setError(r); else listo();
    } catch (e) { setError((e as Error).message); }
    setEnviando('');
  };
  const reps = [...datos.repartidores].sort((a, b) => Number(b.disponible && !b.enCamino) - Number(a.disponible && !a.enCamino));
  return (
    <div className="fixed inset-0 z-50 flex items-end min-[700px]:items-center justify-center">
      <div className="absolute inset-0 bg-[#1F2933]/50" onClick={cerrar} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Escoger domiciliario" className="hoja-sube relative bg-white w-full max-w-md rounded-t-[5px] min-[700px]:rounded-[5px] p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-poppins font-semibold text-[18px]">¿Quién lo lleva?</h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center text-[#5B6670]"><X size={22} /></button>
        </div>
        <p className="text-[14px] text-[#5B6670]">{pedidos.length === 1 ? '1 pedido' : `${pedidos.length} pedidos`}. La caja arma la ruta y al domiciliario le llega el aviso para aceptarla.</p>
        {!datos.caja && <p className="text-[14px] text-[#8A4B00] mt-2">La caja está apagada: saldrá cuando DomiRuta se abra.</p>}
        <ul className="mt-3 divide-y divide-[#E3E7EC] border border-[#E3E7EC] rounded-[5px]">
          {reps.length === 0 && <li className="p-4 text-[14px] text-[#5B6670]">No hay domiciliarios activos. Agrégalos en DomiRuta › Configuración › Domiciliarios.</li>}
          {reps.map((r) => (
            <li key={r.id}>
              <button type="button" disabled={!!enviando} onClick={() => elegir(r.id)}
                className="w-full min-h-14 px-3 py-2 flex items-center justify-between gap-3 text-left hover:bg-[#F2F4F7] disabled:opacity-60">
                <span className="font-poppins font-semibold text-[15px]">{r.nombre}</span>
                <span className={`text-[13px] font-medium ${r.enCamino ? 'text-[#8A4B00]' : r.disponible ? 'text-[#1E7A44]' : 'text-[#5B6670]'}`}>
                  {enviando === r.id ? 'Asignando…' : r.enCamino ? 'Va en camino' : r.disponible ? 'Disponible' : 'No disponible'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="mt-3 text-[14px] text-[#B03030] font-medium">{error}</p>}
      </div>
    </div>
  );
}
