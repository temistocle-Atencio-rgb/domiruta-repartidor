import { useState } from 'react';
import { ArrowLeft, Bike, Store } from 'lucide-react';
import { Tienda, Producto, Entrega, PedidoNuevo } from './tipos.ts';
import { pesos, hacerPedido, leerCliente, guardarCliente } from './datos.ts';
import { MapaPin } from './MapaPin.tsx';
import { MEDIOS, mediosDe } from './pagos.ts';

interface Props {
  tienda: Tienda;
  lineas: { p: Producto; n: number }[];
  subtotal: number;
  volver: () => void;
  listo: (codigo: string, total: number, nombre: string) => void;
  /** El servidor dijo que algo se agotó: hay que recargar el catálogo */
  recargar: () => void;
}

const campo = 'w-full h-12 rounded-[5px] border border-[#C7CED6] bg-white px-3 text-[16px] outline-none focus:border-[#005198] focus:outline focus:outline-2 focus:outline-[#005198]';
const etiqueta = 'block text-[14px] font-medium mb-1';

export function DatosPedido({ tienda, lineas, subtotal, volver, listo, recargar }: Props) {
  const guardado = leerCliente();
  const [nombre, setNombre] = useState(guardado.nombre);
  const [celular, setCelular] = useState(guardado.celular);
  const [correo, setCorreo] = useState(guardado.correo);
  const [entrega, setEntrega] = useState<Entrega>('domicilio');
  const [direccion, setDireccion] = useState(guardado.direccion);
  const [referencia, setReferencia] = useState(guardado.referencia);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const medios = mediosDe(tienda.pagos);
  const [pago, setPago] = useState('efectivo');
  const [pagaCon, setPagaCon] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const domicilio = entrega === 'domicilio' ? tienda.domicilio : 0;
  const total = subtotal + domicilio;
  const cel = celular.replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
  const pagaNum = Number(pagaCon.replace(/\D/g, '')) || 0;

  const revisar = (): string => {
    if (nombre.trim().length < 2) return 'Escribe tu nombre.';
    if (!/^3\d{9}$/.test(cel)) return 'El celular son 10 números y empieza por 3.';
    if (correo.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())) return 'Revisa el correo (o déjalo vacío).';
    if (entrega === 'domicilio' && direccion.trim().length < 5) return 'Escribe la dirección.';
    if (pago === 'efectivo' && pagaNum > 0 && pagaNum < total) return `Con ${pesos(pagaNum)} no alcanza: el total es ${pesos(total)}.`;
    return '';
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const malo = revisar();
    setError(malo);
    if (malo) { requestAnimationFrame(() => document.getElementById('error-pedido')?.focus()); return; }
    const p: PedidoNuevo = {
      nombre: nombre.trim(), celular: cel, correo: correo.trim(), entrega,
      direccion: entrega === 'domicilio' ? direccion.trim() : '', referencia: entrega === 'domicilio' ? referencia.trim() : '',
      lat: entrega === 'domicilio' ? pos?.lat ?? null : null, lon: entrega === 'domicilio' ? pos?.lon ?? null : null,
      pago, pagaCon: pago === 'efectivo' && pagaNum > 0 ? pagaNum : null, nota: nota.trim(),
      items: lineas.map(({ p: x, n }) => ({ id: x.id, cantidad: n })),
    };
    setEnviando(true);
    guardarCliente({ nombre: p.nombre, celular: cel, correo: p.correo, direccion: direccion.trim(), referencia: referencia.trim() });
    const r = await hacerPedido(p);
    setEnviando(false);
    if ('codigo' in r) { listo(r.codigo, r.total, p.nombre); return; }
    setError(r.detalle);
    if (r.error === 'agotado' || r.error === 'cerrada' || r.error === 'minimo') recargar();
    requestAnimationFrame(() => document.getElementById('error-pedido')?.focus());
  };

  const opcion = (activa: boolean) =>
    `flex-1 h-14 rounded-[5px] border-2 flex items-center justify-center gap-2 font-poppins font-semibold text-[14px] ${activa
      ? 'border-[#005198] text-[#003A73] bg-[#EAF2FA]' : 'border-[#E3E7EC] text-[#5B6670] bg-white'}`;

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-[#003A73] text-white sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-1 h-14 px-1">
          <button type="button" onClick={volver} aria-label="Volver a la tienda"
            className="w-12 h-12 flex items-center justify-center"><ArrowLeft size={22} /></button>
          <h1 className="font-poppins font-semibold text-[17px]">Datos del pedido</h1>
        </div>
      </header>

      <form onSubmit={enviar} noValidate className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 space-y-3">
          <h2 className="font-poppins font-semibold text-[16px]">Tus datos</h2>
          <div><label className={etiqueta} htmlFor="t-nombre">Nombre</label>
            <input id="t-nombre" className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoComplete="name" /></div>
          <div><label className={etiqueta} htmlFor="t-cel">Celular (WhatsApp)</label>
            <input id="t-cel" className={campo} value={celular} onChange={(e) => setCelular(e.target.value)} inputMode="tel" maxLength={16}
              autoComplete="tel-national" placeholder="300 123 4567" /></div>
          <div><label className={etiqueta} htmlFor="t-correo">Correo <span className="text-[#5B6670] font-normal">(si quieres)</span></label>
            <input id="t-correo" className={campo} value={correo} onChange={(e) => setCorreo(e.target.value)} inputMode="email" maxLength={120} autoComplete="email" /></div>
        </section>

        <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 space-y-3">
          <h2 className="font-poppins font-semibold text-[16px]">¿Cómo lo recibes?</h2>
          <div className="flex gap-2" role="radiogroup" aria-label="Cómo lo recibes">
            <button type="button" role="radio" aria-checked={entrega === 'domicilio'} onClick={() => setEntrega('domicilio')} className={opcion(entrega === 'domicilio')}>
              <Bike size={18} />A domicilio</button>
            <button type="button" role="radio" aria-checked={entrega === 'retiro'} onClick={() => setEntrega('retiro')} className={opcion(entrega === 'retiro')}>
              <Store size={18} />Lo recojo</button>
          </div>
          {entrega === 'domicilio' ? (
            <>
              <div><label className={etiqueta} htmlFor="t-dir">Dirección</label>
                <input id="t-dir" className={campo} value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200}
                  autoComplete="street-address" placeholder="Calle 15 # 10-20, barrio" /></div>
              <div><label className={etiqueta} htmlFor="t-ref">Referencia <span className="text-[#5B6670] font-normal">(si quieres)</span></label>
                <input id="t-ref" className={campo} value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={200}
                  placeholder="Casa azul, al lado de la tienda" /></div>
              <div><p className={etiqueta}>Marca tu casa en el mapa <span className="text-[#5B6670] font-normal">(ayuda al domiciliario)</span></p>
                <MapaPin lat={pos?.lat ?? null} lon={pos?.lon ?? null} cambiar={(lat, lon) => setPos({ lat, lon })} /></div>
            </>
          ) : (
            <p className="text-[14px] text-[#5B6670]">Lo recoges en la tienda{tienda.direccion ? `: ${tienda.direccion}` : ''}. Te avisamos cuando esté listo.</p>
          )}
        </section>

        <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 space-y-3">
          <h2 className="font-poppins font-semibold text-[16px]">¿Cómo pagas?</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cómo pagas">
            {medios.map((m) => {
              const activo = pago === m;
              return (
                <button key={m} type="button" role="radio" aria-checked={activo} onClick={() => setPago(m)}
                  className={`h-16 rounded-[5px] border-2 flex flex-col items-center justify-center gap-1 px-2 ${activo
                    ? 'border-[#005198] bg-[#EAF2FA]' : 'border-[#E3E7EC] bg-white'}`}>
                  <img src={`./pagos/${m}.png`} alt="" className="h-7 max-w-[90%] object-contain" />
                  <span className={`text-[12px] font-poppins ${activo ? 'font-semibold text-[#003A73]' : 'font-medium text-[#5B6670]'}`}>{MEDIOS[m].texto}</span>
                </button>
              );
            })}
          </div>
          {pago === 'efectivo' ? (
            <div><label className={etiqueta} htmlFor="t-paga">¿Con cuánto pagas? <span className="text-[#5B6670] font-normal">(para llevarte el cambio)</span></label>
              <input id="t-paga" className={campo} value={pagaCon ? pesos(pagaNum) : ''} inputMode="numeric"
                onChange={(e) => setPagaCon(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder={pesos(Math.ceil(total / 10000) * 10000 || 0)} />
              {pagaNum >= total && pagaNum > 0 && <p className="text-[13px] text-[#1E7A44] mt-1">Te llevamos {pesos(pagaNum - total)} de cambio.</p>}
            </div>
          ) : (
            <p className="text-[14px] text-[#5B6670]">{MEDIOS[pago]?.ayuda}</p>
          )}
          <div><label className={etiqueta} htmlFor="t-nota">Nota para la tienda <span className="text-[#5B6670] font-normal">(si quieres)</span></label>
            <textarea id="t-nota" className={campo + ' h-20 py-2 resize-none'} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300}
              placeholder="Ej.: el pan bien tostado" /></div>
        </section>

        <section className="bg-white rounded-[5px] border border-[#E3E7EC] p-4">
          <h2 className="font-poppins font-semibold text-[16px] mb-2">Resumen</h2>
          <ul className="text-[14px] space-y-1">
            {lineas.map(({ p, n }) => (
              <li key={p.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{n} × {p.nombre}</span><span className="shrink-0">{pesos(p.precio * n)}</span></li>
            ))}
          </ul>
          <dl className="text-[14px] border-t border-[#E3E7EC] mt-3 pt-2 space-y-1">
            <div className="flex justify-between"><dt className="text-[#5B6670]">Productos</dt><dd>{pesos(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-[#5B6670]">Domicilio</dt>
              <dd>{entrega === 'retiro' ? 'No aplica' : domicilio > 0 ? pesos(domicilio) : 'Gratis'}</dd></div>
            <div className="flex justify-between font-poppins font-semibold text-[18px] pt-1"><dt>Total</dt><dd>{pesos(total)}</dd></div>
          </dl>
        </section>

        {error && (
          <p id="error-pedido" tabIndex={-1} role="alert" className="text-[#B03030] text-[14px] font-medium bg-white border border-[#B03030] rounded-[5px] p-3 outline-none">{error}</p>
        )}

        <button type="submit" disabled={enviando}
          className="w-full h-14 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold text-[16px] disabled:opacity-70">
          {enviando ? 'Enviando…' : `Hacer pedido · ${pesos(total)}`}
        </button>
        <p className="text-[12px] text-[#5B6670] text-center pb-4">Tus datos solo los ve la tienda, para llevarte el pedido.</p>
      </form>
    </div>
  );
}
