/**
 * Tipos de datos para DomiRuta Repartidor
 */

export type EstadoEntrega = 'en_camino' | 'entregado' | 'no_entregado';

export interface Parada {
  id: string | number;
  orden: number;
  nombre: string;
  direccion: string;
  referencia?: string | null;
  telefono?: string | null;
  lat?: number | null;
  lon?: number | null;
  cobrar: number;
  paga_con: number;
  estado: EstadoEntrega;
  motivo?: string | null;
  tiene_foto?: boolean;
  venta?: string | null;
  productos?: number | null;
}

export interface MarcarEntregaParams {
  p_codigo: string;
  p_id: string | number;
  p_estado: EstadoEntrega;
  p_motivo: string | null;
}

export interface Mensaje {
  id: number;
  de: 'tienda' | 'repartidor';
  texto: string;
  creado: string;
  leido?: boolean;
}

export interface InfoSalida {
  tienda: string;
  repartidor: string;
  creada: string;
  aceptada: boolean;
  rechazada: boolean;
}

export interface ResumenSalidaGuardado {
  entregadas: number;
  noEntregadas: number;
  plataCobrada: number;
}
