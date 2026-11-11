import { useEffect, useState } from 'react';
import { VAPID_PUBLICA } from '../supabase.ts';
import { aBase64Url, claveABytes } from './AvisosPush.tsx';
import { esApp } from '../utils/instalar.ts';

type Guardar = (endpoint: string, p256dh: string, auth: string) => Promise<boolean>;

interface Props {
  texto: string; // lo que dice el botón
  listo: string; // lo que dice cuando ya quedó
  guardar: Guardar;
}

const soporta = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** La suscripción de este celular (la misma para las tres páginas: comparten el service worker). */
async function suscripcion(pedir: boolean): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  const hay = await reg.pushManager.getSubscription();
  if (hay || !pedir) return hay;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(VAPID_PUBLICA) });
}

/**
 * «Activar avisos»: pide permiso, crea la suscripción y la guarda en Supabase con `guardar`.
 * Si ya tenía permiso, la vuelve a guardar sola al abrir (así sigue llegando aunque cambie de pedido o de sesión).
 */
export function ActivarAvisos({ texto, listo, guardar }: Props) {
  const [estado, setEstado] = useState<'inicial' | 'activando' | 'listo' | 'bloqueado' | 'error'>('inicial');
  const iphone = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (!soporta() || !VAPID_PUBLICA) return;
    if (Notification.permission === 'denied') { setEstado('bloqueado'); return; }
    if (Notification.permission !== 'granted') return;
    suscripcion(false)
      .then(async (s) => {
        if (!s) return;
        const ok = await guardar(s.endpoint, aBase64Url(s.getKey('p256dh')), aBase64Url(s.getKey('auth')));
        if (ok) setEstado('listo');
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!VAPID_PUBLICA) return null;
  if (iphone && !esApp()) {
    return <p className="text-[13px] text-[#5B6670]">Para recibir avisos en iPhone, primero instala la app (Compartir › Agregar a inicio).</p>;
  }
  if (!soporta()) return null;
  if (estado === 'listo') return <p className="text-[13px] text-[#1E7A44] font-medium">{listo}</p>;

  const activar = async () => {
    setEstado('activando');
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') { setEstado('bloqueado'); return; }
      const s = await suscripcion(true);
      if (!s) { setEstado('error'); return; }
      const ok = await guardar(s.endpoint, aBase64Url(s.getKey('p256dh')), aBase64Url(s.getKey('auth')));
      setEstado(ok ? 'listo' : 'error');
    } catch {
      setEstado('error');
    }
  };

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={activar} disabled={estado === 'activando' || estado === 'bloqueado'}
        className="w-full min-h-[44px] px-3 rounded-[5px] bg-[#005198] hover:bg-[#003A73] text-white font-poppins font-semibold text-[14px] cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#005198] focus:ring-offset-2">
        {estado === 'activando' ? 'Activando…' : texto}
      </button>
      {estado === 'bloqueado' && (
        <p className="text-[13px] text-[#B03030]">Los avisos están bloqueados para esta página. Actívalos en los ajustes del navegador (candado › Notificaciones › Permitir).</p>
      )}
      {estado === 'error' && <p className="text-[13px] text-[#B03030]">No se pudieron activar los avisos. Revisa el internet e intenta otra vez.</p>}
    </div>
  );
}
