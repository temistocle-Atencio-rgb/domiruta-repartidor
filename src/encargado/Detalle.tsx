import { useEffect, useRef, useState } from 'react';
import { X, Phone, MapPin, Printer, MessageCircle, ReceiptText, Send } from 'lucide-react';
import { PedidoE, Tablero, accion, chat, escribir, enlaceComprobante, hace, MEDIO, pagaAntes, MensajeChat } from './datos.ts';
import { pesos } from '../tienda/datos.ts';
import { Foto } from '../tienda/Foto.tsx';
import { Asignar } from './Asignar.tsx';

interface Props { p: PedidoE; datos: Tablero; cerrar: () => void; recargar: () => void }

const MOTIVOS = ['Se agotó un producto', 'No llegamos a esa dirección', 'No llegó el pago', 'El cliente lo pidió', 'La tienda ya cerró'];

function leerEmpaque(id: number): number[] {
  try { return JSON.parse(localStorage.getItem('empaque_' + id) || '[]'); } catch { return []; }
}

export function Detalle({ p, datos, cerrar, recargar }: Props) {
  const [hechos, setHechos] = useState<number[]>(() => leerEmpaque(p.id));
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [verChat, setVerChat] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  useEffect(() => { try { localStorage.setItem('empaque_' + p.id, JSON.stringify(hechos)); } catch { /* privado */ } }, [hechos, p.id]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [cerrar]);

  const hacer = async (a: string, dato?: string) => {
    setOcupado(true);
    setError('');
    try {
      const r = await accion(p.id, a, dato);
      if (r) setError(r);
      recargar();
    } catch (e) { setError((e as Error).message); }
    setOcupado(false);
  };
  const verComprobante = async () => {
    const w = window.open('', '_blank');
    try { const u = await enlaceComprobante(p.id); if (w) w.location.href = u; else window.location.href = u; }
    catch (e) { w?.close(); setError((e as Error).message); }
  };

  const empacando = p.estado === 'aceptado';
  const porEmpacar = p.items.filter((i) => !p.faltantes.includes(i.id));
  const todoListo = porEmpacar.length > 0 && porEmpacar.every((i) => hechos.includes(i.id));
  const totalReal = p.domicilio + porEmpacar.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const sinPagar = pagaAntes(p) && !p.pagado;
  const trabajo = datos.trabajos.find((t) => (t.datos.pedido === p.id || t.datos.pedidos?.includes(p.id)));

  // la acción principal (el único botón naranja de la pantalla)
  let principal: { texto: string; hacer: () => void; activo: boolean } | null = null;
  if (p.estado === 'nuevo') principal = { texto: 'Aceptar pedido', hacer: () => hacer('aceptar'), activo: true };
  else if (empacando && sinPagar) principal = { texto: 'Confirmar pago', hacer: () => hacer('pagado'), activo: p.comprobante };
  else if (empacando) principal = { texto: todoListo ? 'Empacado' : `Marca los ${porEmpacar.length - porEmpacar.filter((i) => hechos.includes(i.id)).length} que faltan`, hacer: () => hacer('empacado'), activo: todoListo };
  else if (p.estado === 'preparando' && p.entrega === 'domicilio') principal = { texto: 'Asignar domiciliario', hacer: () => setAsignando(true), activo: true };
  else if (p.estado === 'preparando') principal = { texto: 'Listo para recoger', hacer: () => hacer('listo_retiro'), activo: true };
  else if (p.estado === 'en_camino' && p.entrega === 'retiro') principal = { texto: 'Ya lo recogió', hacer: () => hacer('entregado_retiro'), activo: true };

  const mapa = p.lat != null && p.lon != null ? `https://www.google.com/maps?q=${p.lat},${p.lon}` : `https://www.google.com/maps/search/${encodeURIComponent(p.direccion + ', Riohacha')}`;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-[#1F2933]/40" onClick={cerrar} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={`Pedido de ${p.nombre}`} className="relative bg-[#F2F4F7] w-full max-w-xl h-full overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E3E7EC] px-4 h-14 flex items-center gap-2">
          <h2 className="font-poppins font-semibold text-[17px] text-[#003A73] truncate flex-1">{p.nombre} · #{p.codigo}</h2>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="w-11 h-11 flex items-center justify-center text-[#5B6670]"><X size={22} /></button>
        </div>
        <div className="p-4 space-y-3 pb-28">
          {/* cliente */}
          <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 text-[14px] space-y-1.5">
            <p className="text-[#5B6670]">{hace(p.creado)}{p.atendidoPor && ` · lo atiende ${p.atendidoPor}`}{p.anteriores > 0 && ` · ${p.anteriores} pedido(s) antes`}</p>
            <p className="flex items-center gap-2"><Phone size={16} className="text-[#005198]" />
              <a href={`tel:${p.celular}`} className="underline underline-offset-2">{p.celular}</a></p>
            <p className="flex items-start gap-2"><MapPin size={16} className="text-[#005198] mt-0.5 shrink-0" />
              {p.entrega === 'domicilio'
                ? <span>{p.direccion}{p.referencia && <span className="text-[#5B6670]"> · {p.referencia}</span>}{' '}
                    <a href={mapa} target="_blank" rel="noopener noreferrer" className="text-[#005198] underline underline-offset-2 whitespace-nowrap">Ver en el mapa</a></span>
                : <span>Lo recoge en la tienda</span>}
            </p>
            {p.nota && <p className="text-[#8A4B00]">Nota: {p.nota}</p>}
            {p.correo && <p className="text-[#5B6670]">Correo: {p.correo}</p>}
          </section>

          {/* empacar */}
          <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4">
            <h3 className="font-poppins font-semibold text-[15px] mb-2">{empacando ? 'Empacar: marca cada producto' : 'Productos'}</h3>
            <ul className="divide-y divide-[#E3E7EC]">
              {p.items.map((i) => {
                const falta = p.faltantes.includes(i.id);
                const listo = hechos.includes(i.id);
                const poco = i.maneja && i.stock != null && i.stock < i.cantidad;
                return (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    {empacando && !falta ? (
                      <input type="checkbox" checked={listo} aria-label={`Empacado: ${i.nombre}`}
                        onChange={() => setHechos((h) => listo ? h.filter((x) => x !== i.id) : [...h, i.id])}
                        className="w-6 h-6 accent-[#005198] shrink-0" />
                    ) : <span className="w-6 shrink-0" />}
                    <Foto src={i.foto} alt="" className="w-12 h-12 rounded-[5px] border border-[#E3E7EC] shrink-0" />
                    <div className={`flex-1 min-w-0 ${falta ? 'line-through text-[#9AA5B1]' : ''}`}>
                      <p className="text-[14px] leading-snug"><span className="font-poppins font-semibold">{i.cantidad} ×</span> {i.nombre}</p>
                      <p className="text-[12px] text-[#5B6670]">{pesos(i.precio * i.cantidad)}
                        {i.maneja && i.stock != null && <span className={poco ? 'text-[#B03030] font-medium' : ''}> · quedan {i.stock}</span>}</p>
                    </div>
                    {empacando && (
                      <button type="button" disabled={ocupado} onClick={() => hacer('faltante', String(i.id))}
                        className={`shrink-0 h-10 px-2.5 rounded-[5px] border text-[13px] font-medium ${falta ? 'border-[#005198] text-[#005198]' : 'border-[#C7CED6] text-[#B03030]'}`}>
                        {falta ? 'Sí hay' : 'No hay'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {p.faltantes.length > 0 && (
              <p className="mt-2 text-[13px] text-[#8A4B00]">Faltan productos: avísale al cliente por el chat. Lo que falta no se cobra.</p>
            )}
            <div className="mt-3 border-t border-[#E3E7EC] pt-2 text-[14px] space-y-0.5">
              {p.domicilio > 0 && <p className="flex justify-between"><span className="text-[#5B6670]">Domicilio</span><span>{pesos(p.domicilio)}</span></p>}
              <p className="flex justify-between font-poppins font-semibold text-[16px]"><span>Total</span>
                <span>{pesos(totalReal)}{totalReal !== p.total && <span className="text-[12px] text-[#5B6670] font-normal line-through ml-1.5">{pesos(p.total)}</span>}</span></p>
            </div>
          </section>

          {/* pago */}
          <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 text-[14px]">
            <h3 className="font-poppins font-semibold text-[15px] mb-1">Pago: {MEDIO[p.pago] ?? p.pago}</h3>
            {!pagaAntes(p)
              ? <p>Paga al recibir{p.pagaCon ? ` con ${pesos(p.pagaCon)} (cambio ${pesos(p.pagaCon - totalReal)})` : ''}.</p>
              : p.pagado ? <p className="text-[#1E7A44] font-medium">Pago confirmado.</p>
              : p.comprobante ? <p className="text-[#8A4B00] font-medium">Llegó el comprobante: revisa que la plata sí haya entrado y confirma el pago.</p>
              : <p className="text-[#8A4B00]">Esperando que el cliente mande la foto del comprobante por WhatsApp.</p>}
            {p.comprobante && (
              <button type="button" onClick={verComprobante}
                className="mt-2 h-11 px-3 rounded-[5px] border border-[#005198] text-[#005198] font-poppins font-semibold text-[14px] flex items-center gap-2">
                <ReceiptText size={17} /> Ver comprobante</button>
            )}
            {p.venta && <p className="mt-2 text-[13px] text-[#5B6670]">Venta registrada en la caja: recibo {p.venta}</p>}
          </section>

          {trabajo && trabajo.estado !== 'hecho' && (
            <p className={`text-[14px] font-medium ${trabajo.estado === 'error' ? 'text-[#B03030]' : 'text-[#005198]'}`}>
              {trabajo.estado === 'pendiente' ? 'La caja lo está haciendo…' : `La caja no pudo: ${trabajo.resultado}`}</p>
          )}

          {/* otras acciones */}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setVerChat((v) => !v)} aria-expanded={verChat}
              className="h-12 rounded-[5px] border border-[#005198] text-[#005198] bg-white font-poppins font-semibold text-[13px] flex items-center justify-center gap-1.5">
              <MessageCircle size={17} /> Chat</button>
            <button type="button" disabled={ocupado || p.estado === 'nuevo'} onClick={() => hacer('imprimir')}
              className="h-12 rounded-[5px] border border-[#005198] text-[#005198] bg-white font-poppins font-semibold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-40">
              <Printer size={17} /> Imprimir</button>
            <button type="button" disabled={ocupado || p.estado === 'en_camino'} onClick={() => setCancelando((v) => !v)}
              className="h-12 rounded-[5px] border border-[#C7CED6] text-[#B03030] bg-white font-poppins font-semibold text-[13px] disabled:opacity-40">
              Cancelar</button>
          </div>
          {cancelando && (
            <div className="bg-white rounded-[5px] border border-[#B03030] p-3">
              <p className="text-[14px] font-medium mb-2">¿Por qué se cancela? Se lo decimos al cliente por WhatsApp.</p>
              <div className="grid gap-2">
                {MOTIVOS.map((m) => (
                  <button key={m} type="button" disabled={ocupado} onClick={() => { setCancelando(false); hacer('cancelar', m); }}
                    className="h-11 rounded-[5px] border border-[#E3E7EC] text-left px-3 text-[14px] hover:border-[#B03030]">{m}</button>
                ))}
              </div>
            </div>
          )}
          {verChat && <Chat pedido={p} />}
          {error && <p role="alert" className="text-[14px] text-[#B03030] font-medium">{error}</p>}
        </div>

        {principal && (
          <div className="fixed bottom-0 right-0 w-full max-w-xl bg-white border-t border-[#E3E7EC] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button type="button" disabled={ocupado || !principal.activo} onClick={principal.hacer}
              className="w-full h-14 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold text-[16px] disabled:bg-[#E3E7EC] disabled:text-[#5B6670]">
              {ocupado ? 'Un momento…' : principal.texto}
            </button>
            {empacando && sinPagar && !p.comprobante && <p className="text-[12px] text-[#5B6670] text-center mt-1">Se activa cuando llegue el comprobante.</p>}
          </div>
        )}
      </div>
      {asignando && <Asignar pedidos={[p.id]} datos={datos} cerrar={() => setAsignando(false)} listo={() => { setAsignando(false); recargar(); }} />}
    </div>
  );
}

const RAPIDAS = ['Ya estamos empacando tu pedido.', 'Tu pedido ya va en camino.', 'Se nos acabó un producto, ¿te mandamos otro parecido?'];

function Chat({ pedido }: { pedido: PedidoE }) {
  const [m, setM] = useState<MensajeChat[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const abajo = useRef<HTMLDivElement>(null);
  const cargar = async () => {
    try { const r = await chat(pedido.id); setM(r.mensajes ?? []); setAbierta(r.abierta); } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { cargar(); const t = window.setInterval(cargar, 8000); return () => window.clearInterval(t); }, [pedido.id]); // eslint-disable-line
  useEffect(() => { abajo.current?.scrollIntoView({ block: 'nearest' }); }, [m.length]);
  const mandar = async (t: string) => {
    if (!t.trim()) return;
    setError('');
    const r = await escribir(pedido.id, t).catch((e) => (e as Error).message);
    if (r) setError(r); else { setTexto(''); cargar(); }
  };
  return (
    <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-3" aria-label="Chat de WhatsApp">
      <h3 className="font-poppins font-semibold text-[15px] mb-2">WhatsApp con {pedido.nombre.split(' ')[0]}</h3>
      <div className="max-h-72 overflow-y-auto space-y-1.5 bg-[#F2F4F7] rounded-[5px] p-2" aria-live="polite">
        {m.length === 0 && <p className="text-[13px] text-[#5B6670] text-center py-4">Todavía no hay mensajes.</p>}
        {m.map((x, i) => (
          <div key={i} className={`max-w-[85%] rounded-[5px] px-2.5 py-1.5 text-[14px] ${x.de === 'cliente' ? 'bg-white mr-auto' : 'bg-[#DCEBFA] ml-auto'}`}>
            <p className="whitespace-pre-line break-words">{x.texto}</p>
            <p className="text-[11px] text-[#5B6670] text-right">{new Date(x.hora).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
              {x.estado === 'error' && <span className="text-[#B03030]"> · no se envió</span>}</p>
          </div>
        ))}
        <div ref={abajo} />
      </div>
      {abierta ? (
        <>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {RAPIDAS.map((r) => <button key={r} type="button" onClick={() => mandar(r)}
              className="h-9 px-2.5 rounded-[5px] border border-[#C7CED6] text-[12px] text-[#003A73] hover:border-[#005198]">{r}</button>)}
          </div>
          <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); mandar(texto); }}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} aria-label="Escribir mensaje"
              placeholder="Escribe un mensaje" className="flex-1 min-w-0 h-11 rounded-[5px] border border-[#C7CED6] px-3 text-[15px] outline-none focus:outline focus:outline-2 focus:outline-[#005198]" />
            <button type="submit" aria-label="Enviar" className="w-11 h-11 rounded-[5px] bg-[#005198] text-white flex items-center justify-center"><Send size={18} /></button>
          </form>
        </>
      ) : (
        <p className="text-[13px] text-[#8A4B00] mt-2">El cliente no ha escrito en las últimas 24 horas, y WhatsApp no deja escribirle libre. Llámalo al{' '}
          <a href={`tel:${pedido.celular}`} className="underline">{pedido.celular}</a>.</p>
      )}
      {error && <p className="text-[13px] text-[#B03030] mt-1">{error}</p>}
    </section>
  );
}
