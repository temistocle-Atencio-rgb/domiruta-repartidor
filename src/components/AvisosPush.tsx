import React, { useEffect, useState } from 'react';
import { VAPID_PUBLICA, guardarSuscripcion } from '../supabase.ts';

/** Clave base64url a bytes (lo que pide pushManager.subscribe). */
function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  const r = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) r[i] = b.charCodeAt(i);
  return r;
}

function aBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  let t = '';
  new Uint8Array(buf).forEach((x) => (t += String.fromCharCode(x)));
  return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Si el celular ya tiene los avisos activados, lo vuelve a registrar en Supabase (en cualquier pantalla). */
export async function registrarAvisosOtraVez(): Promise<boolean> {
  try {
    if (!VAPID_PUBLICA || !('serviceWorker' in navigator) || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    const r = await navigator.serviceWorker.ready;
    const sub = await r.pushManager.getSubscription();
    if (!sub) return false;
    return await guardarSuscripcion('', '', sub.endpoint, aBase64Url(sub.getKey('p256dh')), aBase64Url(sub.getKey('auth')));
  } catch {
    return false;
  }
}

interface Props {
  enlace: string;
  dispositivo: string;
  esIos: boolean;
  esStandalone: boolean;
}

/**
 * «Activar avisos en este celular»: avisos aunque la app esté cerrada (etapa F).
 * Si todavía no hay clave de notificaciones, no muestra nada.
 */
export function AvisosPush({ enlace, dispositivo, esIos, esStandalone }: Props) {
  const soporta =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [estado, setEstado] = useState<'inicial' | 'activando' | 'listo' | 'bloqueado' | 'error'>('inicial');

  useEffect(() => {
    if (!soporta || !VAPID_PUBLICA) return;
    if (Notification.permission === 'denied') setEstado('bloqueado');
    // si este celular ya tiene los avisos, se vuelve a registrar en Supabase cada vez (al entrar con la clave,
    // Supabase borra los celulares viejos: sin esto, el aviso no le llegaría con la app cerrada)
    navigator.serviceWorker.ready
      .then((r) => r.pushManager.getSubscription())
      .then(async (s) => {
        if (!s || Notification.permission !== 'granted') return;
        const ok = await guardarSuscripcion(enlace, dispositivo, s.endpoint, aBase64Url(s.getKey('p256dh')),
          aBase64Url(s.getKey('auth')));
        setEstado(ok ? 'listo' : 'inicial'); // si no se pudo, vuelve a salir el botón
      })
      .catch(() => undefined);
  }, [soporta]);

  if (!VAPID_PUBLICA) return null;
  if (esIos && !esStandalone) {
    return (
      <p className="font-inter text-[13px] text-[#5B6670] m-0">Para recibir avisos en iPhone, primero instala la app.</p>
    );
  }
  if (!soporta) return null;

  const activar = async () => {
    setEstado('activando');
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado('bloqueado');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(VAPID_PUBLICA) }));
      const ok = await guardarSuscripcion(enlace, dispositivo, sub.endpoint, aBase64Url(sub.getKey('p256dh')),
        aBase64Url(sub.getKey('auth')));
      setEstado(ok ? 'listo' : 'error');
    } catch {
      setEstado('error');
    }
  };

  if (estado === 'listo') {
    return <p className="font-inter text-[13px] text-[#1E7A44] m-0">Listo, te avisaremos aunque tengas la app cerrada.</p>;
  }
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={activar}
        disabled={estado === 'activando' || estado === 'bloqueado'}
        className="w-full min-h-[48px] bg-[#005198] hover:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[14px] cursor-pointer disabled:opacity-50"
      >
        {estado === 'activando' ? 'Activando…' : 'Activar avisos en este celular'}
      </button>
      {estado === 'bloqueado' && (
        <p className="font-inter text-[13px] text-[#B03030] m-0">
          Los avisos están bloqueados. Actívalos en los ajustes del navegador.
        </p>
      )}
      {estado === 'error' && (
        <p className="font-inter text-[13px] text-[#B03030] m-0">No se pudieron activar los avisos.</p>
      )}
    </div>
  );
}
