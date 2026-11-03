import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { leerSesion, salir, tablero, Tablero as TTablero, SesionCerrada } from './datos.ts';
import { Entrar } from './Entrar.tsx';
import { Tablero } from './Tablero.tsx';
import { Detalle } from './Detalle.tsx';

/** Dos notas suaves cuando llega un pedido nuevo (no el pitido de Windows). */
function sonar() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t); o.stop(t + 0.3);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch { /* sin sonido */ }
}

export function Encargado() {
  const [conSesion, setConSesion] = useState(!!leerSesion());
  const [aviso, setAviso] = useState('');
  const [datos, setDatos] = useState<TTablero | null>(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState<number | null>(null);
  const vistos = useRef<Set<number> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const t = await tablero();
      setDatos(t);
      setError('');
      const nuevos = t.pedidos.filter((p) => p.estado === 'nuevo').map((p) => p.id);
      if (vistos.current && nuevos.some((id) => !vistos.current!.has(id))) {
        sonar();
        document.title = '(¡Nuevo!) Pedidos en línea';
      }
      vistos.current = new Set(nuevos);
    } catch (e) {
      if (e instanceof SesionCerrada) { setConSesion(false); setAviso(e.message); return; }
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!conSesion) return;
    cargar();
    const r = window.setInterval(cargar, 10000);
    const volver = () => { if (!document.hidden) { document.title = 'Pedidos en línea · DomiRuta'; cargar(); } };
    document.addEventListener('visibilitychange', volver);
    return () => { window.clearInterval(r); document.removeEventListener('visibilitychange', volver); };
  }, [conSesion, cargar]);

  if (!conSesion) return <Entrar aviso={aviso} listo={() => { setAviso(''); setConSesion(true); }} />;

  const pedido = datos?.pedidos.find((p) => p.id === abierto) ?? null;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#003A73] text-white">
        <div className="max-w-[1500px] mx-auto px-4 h-14 flex items-center gap-3">
          <h1 className="font-poppins font-semibold text-[17px] truncate">Pedidos · {datos?.tienda || 'Tienda'}</h1>
          <span className={`ml-auto text-[13px] font-medium flex items-center gap-1.5 ${datos?.caja ? 'text-[#9FE0B8]' : 'text-[#FFC9C9]'}`}>
            <span className={`w-2 h-2 rounded-full ${datos?.caja ? 'bg-[#9FE0B8]' : 'bg-[#FFC9C9]'}`} aria-hidden="true" />
            {datos ? (datos.caja ? 'Caja conectada' : 'Caja apagada') : '…'}
          </span>
          <span className="hidden min-[700px]:inline text-[13px] text-white/80">{datos?.nombre}</span>
          <button type="button" onClick={async () => { await salir(); setConSesion(false); }} aria-label="Cerrar sesión"
            className="h-10 px-3 rounded-[5px] bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-[13px]">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>
      {datos && !datos.caja && (
        <p className="bg-[#FDEBD3] text-[#8A4B00] text-[14px] font-medium px-4 py-2.5 text-center">
          La caja está apagada: puedes atender y empacar, pero la venta, la impresión y la salida del domiciliario se hacen cuando DomiRuta se abra.
        </p>
      )}
      {error && <p className="bg-white text-[#B03030] text-[14px] px-4 py-2 text-center border-b border-[#E3E7EC]">{error}</p>}
      <main className="flex-1 max-w-[1500px] w-full mx-auto">
        {!datos ? <p className="text-center text-[#5B6670] py-20" role="status">Cargando pedidos…</p>
          : <Tablero datos={datos} abrir={setAbierto} recargar={cargar} />}
      </main>
      {pedido && datos && <Detalle p={pedido} datos={datos} cerrar={() => setAbierto(null)} recargar={cargar} />}
    </div>
  );
}
