import { getSupabaseClient, SUPABASE_URL, SUPABASE_KEY } from '../supabase.ts';

export interface ItemE { id: number; nombre: string; precio: number; cantidad: number; foto: string | null; stock: number | null; maneja: boolean }
export interface PedidoE {
  id: number; codigo: string; creado: string; nombre: string; celular: string; correo: string;
  entrega: 'domicilio' | 'retiro'; direccion: string; referencia: string; lat: number | null; lon: number | null;
  pago: string; pagaCon: number | null; nota: string; subtotal: number; domicilio: number; total: number;
  estado: 'nuevo' | 'aceptado' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado'; motivo: string;
  pagado: boolean; comprobante: boolean; empacado: boolean; faltantes: number[]; atendidoPor: string; venta: number | null;
  items: ItemE[]; anteriores: number;
}
export interface RepartidorE { id: string; nombre: string; disponible: boolean; visto: string | null; enCamino: boolean }
export interface TrabajoE { id: number; tipo: string; estado: 'pendiente' | 'hecho' | 'error'; resultado: string; datos: { pedido?: number; pedidos?: number[] } }
export interface Tablero { nombre: string; tienda: string; caja: boolean; cajaVista: string | null; pedidos: PedidoE[]; repartidores: RepartidorE[]; trabajos: TrabajoE[] }
export interface MensajeChat { de: 'cliente' | 'tienda'; texto: string; hora: string; estado: string }

const CLAVE = 'domiruta_encargado';
export const leerSesion = (): string | null => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
const guardarSesion = (s: string | null) => { try { if (s) localStorage.setItem(CLAVE, s); else localStorage.removeItem(CLAVE); } catch { /* privado */ } };

export class SesionCerrada extends Error {}
const SIN_RED = 'No se pudo conectar. Revisa el internet.';

async function rpc<T>(nombre: string, args: Record<string, unknown>): Promise<T> {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(SIN_RED);
  const { data, error } = await sb.rpc(nombre, args);
  if (error) {
    if (/sesion_cerrada/.test(error.message)) { guardarSesion(null); throw new SesionCerrada('Tu sesión se cerró. Entra otra vez.'); }
    throw new Error(SIN_RED);
  }
  return data as T;
}
function sesion(): string { const s = leerSesion(); if (!s) throw new SesionCerrada('Entra con tu celular y tu clave.'); return s; }

export async function entrar(celular: string, clave: string): Promise<string | null> {
  const r = await rpc<{ ok: boolean; sesion?: string; error?: string }>('enc_entrar', { p_celular: celular, p_clave: clave });
  if (r?.ok && r.sesion) { guardarSesion(r.sesion); return null; }
  return r?.error ?? 'No se pudo entrar';
}
export async function salir() { const s = leerSesion(); guardarSesion(null); if (s) await rpc('enc_salir', { p_sesion: s }).catch(() => undefined); }
export const tablero = () => rpc<Tablero>('enc_tablero', { p_sesion: sesion() });
export async function accion(pedido: number, a: string, dato?: string): Promise<string | null> {
  const r = await rpc<{ ok: boolean; error?: string }>('enc_accion', { p_sesion: sesion(), p_pedido: pedido, p_accion: a, p_dato: dato ?? null });
  return r?.ok ? null : r?.error ?? 'No se pudo';
}
export async function asignar(pedidos: number[], repartidor: string): Promise<string | null> {
  const r = await rpc<{ ok: boolean; error?: string }>('enc_asignar', { p_sesion: sesion(), p_pedidos: pedidos, p_repartidor: repartidor });
  return r?.ok ? null : r?.error ?? 'No se pudo';
}
export const chat = (pedido: number) => rpc<{ abierta: boolean; mensajes: MensajeChat[] }>('enc_chat', { p_sesion: sesion(), p_pedido: pedido });
export async function escribir(pedido: number, texto: string): Promise<string | null> {
  const r = await rpc<{ ok: boolean; error?: string }>('enc_escribir', { p_sesion: sesion(), p_pedido: pedido, p_texto: texto });
  return r?.ok ? null : r?.error ?? 'No se pudo';
}
/** Enlace de 10 minutos a la foto del comprobante (la sesión va en el cuerpo, no en la dirección). */
export async function enlaceComprobante(pedido: number): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ comprobante: pedido, sesion: sesion() }),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { guardarSesion(null); throw new SesionCerrada('Tu sesión se cerró. Entra otra vez.'); }
  if (!r.ok || !d.url) throw new Error('No se pudo abrir el comprobante');
  return d.url;
}

export const pagaAntes = (p: PedidoE) => !['efectivo', 'tarjeta_debito', 'tarjeta_credito'].includes(p.pago);
export type Columna = 'nuevos' | 'pagar' | 'empacar' | 'listos' | 'camino';
export function columna(p: PedidoE): Columna | null {
  if (p.estado === 'nuevo') return 'nuevos';
  if (p.estado === 'aceptado') return pagaAntes(p) && !p.pagado ? 'pagar' : 'empacar';
  if (p.estado === 'preparando') return 'listos';
  if (p.estado === 'en_camino') return 'camino';
  return null;
}
export function hace(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h ${m % 60} min`;
}
export const MEDIO: Record<string, string> = {
  efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', breb: 'Bre-B', transferencia: 'Transferencia',
  bancolombia: 'Bancolombia', tarjeta_debito: 'Tarjeta débito', tarjeta_credito: 'Tarjeta crédito', nu: 'Nu', dale: 'Dale!', mercado_pago: 'Mercado Pago',
};
