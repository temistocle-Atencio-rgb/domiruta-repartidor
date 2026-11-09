/**
 * Instalar como app (las tres páginas: repartidor, tienda y pedidos).
 * El aviso «se puede instalar» (beforeinstallprompt) llega una sola vez y muy temprano: se guarda
 * aquí desde que carga la página, antes de que se dibuje el botón.
 */
type Aviso = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let guardado: Aviso | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    guardado = e as Aviso;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    guardado = null;
    avisar();
  });
}

/** Registra el service worker (sin él Chrome no ofrece instalar). */
export function registrarApp(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const r = () => navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service Worker:', err));
  if (document.readyState === 'complete') r();
  else window.addEventListener('load', r);
}

export const sePuedeInstalar = () => guardado !== null;

export function alCambiar(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** Abre la ventana de Chrome para instalar. true si la instalaron. */
export async function instalar(): Promise<boolean> {
  const g = guardado;
  if (!g) return false;
  await g.prompt();
  const r = await g.userChoice;
  if (r.outcome === 'accepted') {
    guardado = null;
    avisar();
    return true;
  }
  return false;
}

/** Ya está abierta como app instalada. */
export function esApp(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as unknown as { standalone?: boolean }).standalone);
}

export type Donde = 'iphone' | 'dentro-de-otra-app' | 'android' | 'computador';

/** Desde dónde se abrió (para decir cómo instalar si Chrome no ofrece el botón). */
export function donde(): Donde {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  // el navegador de adentro de WhatsApp, Facebook o Instagram no deja instalar
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/i.test(ua)) return 'dentro-de-otra-app';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  return 'computador';
}
