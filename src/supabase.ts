import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Parada, Mensaje, InfoSalida, RutaSalida, EstadoEntrega, PedidoCliente, RespuestaPedidoCodigo, RespuestaMisSalidas } from './types.ts';

// ============================================================
// CONSTANTES DE CONFIGURACIÓN DE SUPABASE
// ============================================================
export const SUPABASE_URL: string = "https://xivokswlegxetxgovhdw.supabase.co";
export const SUPABASE_KEY: string = "sb_publishable_iMN9hA3fCwQKXOe6Pp5rIA__uoCp2_K";

// Detectar si las constantes ya fueron configuradas por el usuario
export const isSupabaseConfigured = (): boolean => {
  const url = (SUPABASE_URL as string).trim();
  const key = (SUPABASE_KEY as string).trim();
  return (
    url !== "PEGAR_AQUI_LA_URL_DEL_PROYECTO" &&
    url !== "" &&
    url.startsWith("http") &&
    key !== "PEGAR_AQUI_LA_CLAVE_PUBLICA" &&
    key !== ""
  );
};

// Instancia del cliente Supabase cuando está configurado
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseInstance;
};

// -------------------------------------------------------------
// Función RPC: info_salida
// -------------------------------------------------------------
export async function infoSalida(codigo: string): Promise<InfoSalida | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('La página no está configurada. Avísale a la tienda.');
  }

  try {
    const { data, error } = await client.rpc('info_salida', { p_codigo: codigo });
    if (error) {
      console.error('Error en supabase.rpc info_salida:', error);
      throw error;
    }
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as InfoSalida;
    }
    if (data && !Array.isArray(data)) {
      return data as InfoSalida;
    }
    return null;
  } catch (err) {
    console.error('Fallo llamando a Supabase RPC info_salida:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// Función RPC: ruta_salida
// -------------------------------------------------------------
export async function rutaSalida(codigo: string): Promise<RutaSalida | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client.rpc('ruta_salida', { p_codigo: codigo });
    if (error) {
      console.error('Error en supabase.rpc ruta_salida:', error);
      return null;
    }
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as RutaSalida;
    }
    if (data && !Array.isArray(data)) {
      return data as RutaSalida;
    }
    return null;
  } catch (err) {
    console.error('Fallo llamando a Supabase RPC ruta_salida:', err);
    return null;
  }
}

// -------------------------------------------------------------
// Función RPC: responder_salida
// -------------------------------------------------------------
export async function responderSalida(
  codigo: string,
  acepta: boolean,
  motivo: string = ''
): Promise<boolean> {
  // false = ya venció o la tomó otro; si falla el internet se lanza un error (no es lo mismo)
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('La página no está configurada. Avísale a la tienda.');
  }
  const { data, error } = await client.rpc('responder_salida', {
    p_codigo: codigo,
    p_acepta: acepta,
    p_motivo: motivo,
  });
  if (error) {
    console.error('Error en supabase.rpc responder_salida:', error);
    throw error;
  }
  return data === true;
}

// -------------------------------------------------------------
// Función RPC: ver_salida
// -------------------------------------------------------------
export async function verSalida(codigo: string): Promise<Parada[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('La página no está configurada. Avísale a la tienda.');
  }

  const { data, error } = await client.rpc('ver_salida', { p_codigo: codigo });
  if (error) {
    console.error('Error en supabase.rpc ver_salida:', error);
    throw error;
  }
  return (data as Parada[]) || [];
}

// -------------------------------------------------------------
// Función RPC: enviar_posicion
// -------------------------------------------------------------
export async function enviarPosicion(
  codigo: string,
  lat: number,
  lon: number,
  precision: number,
  rumbo: number | null,
  velocidad: number | null
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.rpc('enviar_posicion', {
      p_codigo: codigo,
      p_lat: lat,
      p_lon: lon,
      p_precision: Math.round(precision),
      p_rumbo: rumbo !== null && !isNaN(rumbo) ? Math.round(rumbo) : null,
      p_velocidad: velocidad !== null && !isNaN(velocidad) ? Number(velocidad.toFixed(1)) : null,
    });

    if (error) {
      console.error('Error en supabase.rpc enviar_posicion:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Fallo al enviar posición:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Función RPC: pausar_ubicacion
// -------------------------------------------------------------
export async function pausarUbicacion(codigo: string, pausar: boolean): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.rpc('pausar_ubicacion', {
      p_codigo: codigo,
      p_pausar: pausar,
    });

    if (error) {
      console.error('Error en supabase.rpc pausar_ubicacion:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Fallo al pausar ubicación:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Función RPC: marcar_entrega_gps
// -------------------------------------------------------------
export async function marcarEntregaGps(
  codigo: string,
  id: string | number,
  estado: EstadoEntrega,
  motivo: string | null = null,
  lat: number | null = null,
  lon: number | null = null
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.rpc('marcar_entrega_gps', {
      p_codigo: codigo,
      p_id: id,
      p_estado: estado,
      p_motivo: motivo ?? '',
      p_lat: lat,
      p_lon: lon,
    });

    if (error) {
      console.error('Error en supabase.rpc marcar_entrega_gps:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Fallo llamando a marcar_entrega_gps:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Función RPC: ver_mensajes
// -------------------------------------------------------------
export async function verMensajes(codigo: string, desdeId: number): Promise<Mensaje[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client.rpc('ver_mensajes', {
      p_codigo: codigo,
      p_desde: desdeId,
    });

    if (error) {
      console.error('Error en supabase.rpc ver_mensajes:', error);
      return [];
    }

    return (data as Mensaje[]) || [];
  } catch (err) {
    console.error('Fallo al obtener mensajes:', err);
    return [];
  }
}

// -------------------------------------------------------------
// Función RPC: enviar_mensaje
// -------------------------------------------------------------
export async function enviarMensaje(codigo: string, texto: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.rpc('enviar_mensaje', {
      p_codigo: codigo,
      p_texto: texto,
    });

    if (error) {
      console.error('Error en supabase.rpc enviar_mensaje:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Fallo al enviar mensaje:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Función RPC: subir_foto
// -------------------------------------------------------------
export async function subirFoto(
  codigo: string,
  id: string | number,
  fotoDataUrl: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  try {
    const { data, error } = await client.rpc('subir_foto', {
      p_codigo: codigo,
      p_id: id,
      p_foto: fotoDataUrl,
    });

    if (error) {
      console.error('Error en supabase.rpc subir_foto:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('Fallo al subir foto:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Formato oficial de pesos colombianos ($12.500, sin decimales)
// -------------------------------------------------------------
export function formatearPesos(valor: number): string {
  if (typeof valor !== 'number' || isNaN(valor)) return '$0';
  const formateado = Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formateado}`;
}

// -------------------------------------------------------------
// Función RPC: ver_pedido
// -------------------------------------------------------------
export async function verPedido(enlace: string): Promise<PedidoCliente | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client.rpc('ver_pedido', {
      p_enlace: enlace,
    });

    if (error) {
      console.error('Error en supabase.rpc ver_pedido:', error);
      return null;
    }

    if (!data) return null;

    if (Array.isArray(data)) {
      return (data[0] as PedidoCliente) || null;
    }
    return data as PedidoCliente;
  } catch (err) {
    console.error('Fallo llamando a ver_pedido:', err);
    return null;
  }
}

// -------------------------------------------------------------
// Función RPC: ver_pedido_codigo
// -------------------------------------------------------------
export async function verPedidoCodigo(
  codigo: string,
  ultimos4: string
): Promise<RespuestaPedidoCodigo> {
  const client = getSupabaseClient();
  if (!client) {
    return { tipo: 'no_encontrado' };
  }

  try {
    const { data, error } = await client.rpc('ver_pedido_codigo', {
      p_codigo: codigo,
      p_ultimos4: ultimos4,
    });

    if (error) {
      console.error('Error en supabase.rpc ver_pedido_codigo:', error);
      return { tipo: 'no_encontrado' };
    }

    if (!data) {
      return { tipo: 'no_encontrado' };
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      (payload as { error: string }).error === 'espera'
    ) {
      return { tipo: 'espera' };
    }

    if (payload && typeof payload === 'object' && 'estado' in payload) {
      return { tipo: 'exito', data: payload as PedidoCliente };
    }

    return { tipo: 'no_encontrado' };
  } catch (err) {
    console.error('Fallo llamando a ver_pedido_codigo:', err);
    return { tipo: 'no_encontrado' };
  }
}

// -------------------------------------------------------------
// Formato amigable de hora para entregas (ej. "10:42 a. m.")
// -------------------------------------------------------------
export function formatearHoraEntrega(fechaIso: string | null): string {
  if (!fechaIso) return '';
  try {
    // Normalizar si viene con formato postgres tipo "2026-11-02 10:42:00+00"
    const fechaLimpia = fechaIso.includes(' ') && !fechaIso.includes('T')
      ? fechaIso.replace(' ', 'T')
      : fechaIso;
    const d = new Date(fechaLimpia);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// -------------------------------------------------------------
// Función RPC: mis_salidas
// -------------------------------------------------------------
export async function misSalidas(
  enlace: string,
  dispositivo: string
): Promise<RespuestaMisSalidas | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('La página no está configurada. Avísale a la tienda.');
  }

  try {
    const { data, error } = await client.rpc('mis_salidas', {
      p_enlace: enlace,
      p_dispositivo: dispositivo,
    });

    if (error) {
      console.error('Error en supabase.rpc mis_salidas:', error);
      throw error;
    }

    if (!data) return null;
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      return data[0] as RespuestaMisSalidas;
    }
    return data as RespuestaMisSalidas;
  } catch (err) {
    console.error('Fallo llamando a Supabase RPC mis_salidas:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// Función RPC: confirmar_dispositivo
// -------------------------------------------------------------
export async function confirmarDispositivo(
  enlace: string,
  dispositivo: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data, error } = await client.rpc('confirmar_dispositivo', {
      p_enlace: enlace,
      p_dispositivo: dispositivo,
    });

    if (error) {
      console.error('Error en supabase.rpc confirmar_dispositivo:', error);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    console.error('Fallo llamando a Supabase RPC confirmar_dispositivo:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Función RPC: cambiar_disponible
// -------------------------------------------------------------
export async function cambiarDisponible(
  enlace: string,
  dispositivo: string,
  disponible: boolean
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data, error } = await client.rpc('cambiar_disponible', {
      p_enlace: enlace,
      p_dispositivo: dispositivo,
      p_disponible: disponible,
    });

    if (error) {
      console.error('Error en supabase.rpc cambiar_disponible:', error);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    console.error('Fallo llamando a Supabase RPC cambiar_disponible:', err);
    return false;
  }
}

