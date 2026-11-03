import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Check } from 'lucide-react';
import { EstadoPedido, EstadoPedidoTexto } from './tipos.ts';
import { pesos, verPedido } from './datos.ts';

const PASOS: { e: EstadoPedidoTexto; texto: string; retiro?: string }[] = [
  { e: 'nuevo', texto: 'Recibido' },
  { e: 'aceptado', texto: 'Aceptado por la tienda' },
  { e: 'preparando', texto: 'Alistando tu pedido' },
  { e: 'en_camino', texto: 'Va en camino', retiro: 'Listo para recoger' },
  { e: 'entregado', texto: 'Entregado' },
];

interface Props { codigo: string; nombre: string; total: number; otroPedido: () => void }

export function PedidoEnviado({ codigo, nombre, total, otroPedido }: Props) {
  const [estado, setEstado] = useState<EstadoPedido | null>(null);
  const [sinRed, setSinRed] = useState(false);
  const [noExiste, setNoExiste] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    let reloj = 0;
    const mirar = async () => {
      try {
        const r = await verPedido(codigo);
        if (!vivo) return;
        setSinRed(false);
        if (r) setEstado(r); else setNoExiste(true);
        if (r && (r.estado === 'entregado' || r.estado === 'cancelado')) return;
      } catch {
        if (vivo) setSinRed(true);
      }
      if (vivo) reloj = window.setTimeout(mirar, document.hidden ? 60000 : 15000);
    };
    mirar();
    const alVolver = () => { if (!document.hidden) { window.clearTimeout(reloj); mirar(); } };
    document.addEventListener('visibilitychange', alVolver);
    return () => { vivo = false; window.clearTimeout(reloj); document.removeEventListener('visibilitychange', alVolver); };
  }, [codigo]);

  const actual = estado?.estado ?? 'nuevo';
  const indice = PASOS.findIndex((p) => p.e === actual);
  const retiro = estado?.entrega === 'retiro';
  const terminado = actual === 'entregado' || actual === 'cancelado';

  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin permiso */ }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-[#003A73] text-white">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center">
          <h1 className="font-poppins font-semibold text-[17px] truncate">{estado?.tienda || 'Tu pedido'}</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {noExiste ? (
          <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-5 text-center">
            <p className="font-poppins font-semibold text-[17px]">No encontramos el pedido {codigo}</p>
            <p className="text-[14px] text-[#5B6670] mt-1">Los pedidos se pueden ver hasta 7 días después.</p>
          </section>
        ) : (
          <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-5 text-center">
            <CheckCircle2 size={44} className="mx-auto text-[#1E7A44]" />
            <h2 className="font-poppins font-semibold text-[20px] mt-2">{nombre ? `¡Listo, ${nombre.split(' ')[0]}!` : 'Tu pedido'}</h2>
            <p className="text-[15px] mt-1">Recibimos tu pedido</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="font-poppins font-bold text-[24px] tracking-[0.12em] text-[#003A73]">{codigo}</span>
              <button type="button" onClick={copiar} aria-label="Copiar el código del pedido"
                className="w-11 h-11 flex items-center justify-center text-[#005198] rounded-[5px]">
                {copiado ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-[14px] text-[#5B6670]">Total a pagar: <span className="font-poppins font-semibold text-[#1F2933]">{pesos(estado?.total ?? total)}</span></p>
          </section>
        )}

        {!noExiste && (
          <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-5" aria-live="polite">
            <h2 className="font-poppins font-semibold text-[16px] mb-3">Cómo va</h2>
            {actual === 'cancelado' ? (
              <div>
                <p className="text-[#B03030] font-poppins font-semibold text-[16px]">La tienda canceló el pedido</p>
                {estado?.motivo && <p className="text-[14px] text-[#5B6670] mt-1">{estado.motivo}</p>}
              </div>
            ) : (
              <ol className="space-y-0">
                {PASOS.map((p, i) => {
                  const hecho = i <= indice;
                  const ahora = i === indice;
                  return (
                    <li key={p.e} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`w-4 h-4 rounded-full border-2 mt-1 ${hecho ? 'bg-[#005198] border-[#005198]' : 'bg-white border-[#C7CED6]'}`} aria-hidden="true" />
                        {i < PASOS.length - 1 && <span className={`w-0.5 flex-1 min-h-6 ${i < indice ? 'bg-[#005198]' : 'bg-[#E3E7EC]'}`} aria-hidden="true" />}
                      </div>
                      <p className={`pb-4 text-[15px] ${ahora ? 'font-poppins font-semibold text-[#003A73]' : hecho ? 'text-[#1F2933]' : 'text-[#9AA5B1]'}`}>
                        {retiro && p.retiro ? p.retiro : p.texto}{ahora && !terminado ? ' (ahora)' : ''}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
            {sinRed && <p className="text-[13px] text-[#8A4B00] mt-1">Sin internet: el estado puede estar atrasado.</p>}
            {!terminado && !sinRed && <p className="text-[12px] text-[#5B6670]">Se actualiza solo. Puedes cerrar esta página y volver luego.</p>}
          </section>
        )}

        <button type="button" onClick={otroPedido}
          className="w-full h-12 rounded-[5px] border border-[#005198] text-[#005198] font-poppins font-semibold">
          Hacer otro pedido
        </button>
      </main>
    </div>
  );
}
