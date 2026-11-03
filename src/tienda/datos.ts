import { getSupabaseClient } from '../supabase.ts';
import { Catalogo, PedidoNuevo, EstadoPedido, Carrito } from './tipos.ts';

const SIN_INTERNET = 'No se pudo conectar. Revisa el internet e intenta otra vez.';

export async function verCatalogo(): Promise<Catalogo> {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(SIN_INTERNET);
  const { data, error } = await sb.rpc('ver_catalogo');
  if (error || !data) throw new Error(SIN_INTERNET);
  return data as Catalogo;
}

export type RespuestaPedido = { codigo: string; total: number } | { error: string; detalle: string };

export async function hacerPedido(p: PedidoNuevo): Promise<RespuestaPedido> {
  const sb = getSupabaseClient();
  if (!sb) return { error: 'red', detalle: SIN_INTERNET };
  try {
    const { data, error } = await sb.rpc('hacer_pedido', { p });
    if (error || !data) return { error: 'red', detalle: SIN_INTERNET };
    if (data.ok) return { codigo: String(data.codigo), total: Number(data.total) };
    return { error: String(data.error || 'datos'), detalle: String(data.detalle || 'Revisa los datos') };
  } catch {
    return { error: 'red', detalle: SIN_INTERNET };
  }
}

/** null = no existe; lanza error si no hay internet (para seguir mostrando el último estado). */
export async function verPedido(codigo: string): Promise<EstadoPedido | null> {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(SIN_INTERNET);
  const { data, error } = await sb.rpc('ver_pedido_web', { p_codigo: codigo });
  if (error) throw new Error(SIN_INTERNET);
  return (data as EstadoPedido) || null;
}

// ---------- lo que se guarda en el celular del cliente ----------
function leer<T>(clave: string, siNo: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : siNo;
  } catch {
    return siNo;
  }
}
function guardar(clave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // modo privado: no pasa nada, solo no se recuerda
  }
}

export const leerCarrito = (): Carrito => {
  const c = leer<Carrito>('domiruta_carrito', {});
  const limpio: Carrito = {};
  for (const [id, n] of Object.entries(c)) {
    const k = Number(id), m = Math.floor(Number(n));
    if (Number.isFinite(k) && m >= 1 && m <= 99) limpio[k] = m;
  }
  return limpio;
};
export const guardarCarrito = (c: Carrito) => guardar('domiruta_carrito', c);

/** Lo que se recuerda en el celular del cliente para no volver a escribirlo (nunca sale de su celular). */
export interface DatosCliente {
  nombre: string; celular: string; correo: string; direccion: string; referencia: string;
  lat: number | null; lon: number | null; entrega: 'domicilio' | 'retiro'; pago: string;
}
const VACIO: DatosCliente = { nombre: '', celular: '', correo: '', direccion: '', referencia: '', lat: null, lon: null, entrega: 'domicilio', pago: 'efectivo' };
export const leerCliente = (): DatosCliente => {
  const d = { ...VACIO, ...leer<Partial<DatosCliente>>('domiruta_cliente', {}) };
  if (typeof d.lat !== 'number' || typeof d.lon !== 'number' || Math.abs(d.lat) > 90 || Math.abs(d.lon) > 180) { d.lat = null; d.lon = null; }
  if (d.entrega !== 'retiro') d.entrega = 'domicilio';
  if (typeof d.pago !== 'string') d.pago = 'efectivo';
  return d;
};
export const guardarCliente = (d: DatosCliente) => guardar('domiruta_cliente', d);
export const borrarCliente = () => guardar('domiruta_cliente', null);

export const leerUltimoPedido = (): string | null => leer<string | null>('domiruta_ultimo_pedido', null);
export const guardarUltimoPedido = (c: string | null) => guardar('domiruta_ultimo_pedido', c);

// ---------- utilidades ----------
export function pesos(v: number): string {
  return '$ ' + Math.round(v || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
export function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
