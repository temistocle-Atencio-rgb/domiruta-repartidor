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
  /** Lo que gana el domiciliario si la entrega (sus domicilios o su tarifa por entrega); 0 = sueldo. */
  ganancia?: number;
  paga_con: number;
  cambio_de?: number | null;
  estado: EstadoEntrega;
  motivo?: string | null;
  tiene_foto?: boolean;
  venta?: string | null;
  productos?: number | null;
  ubicacion_pendiente?: boolean;
  pendiente_envio?: boolean; // se marcó sin señal y falta mandarla
}

export interface InfoSalida {
  tienda: string;
  repartidor: string;
  creada: string;
  aceptada: boolean;
  rechazada: boolean;
  vence_en?: string | null;
  vencida?: boolean;
  tienda_lat?: number | null;
  tienda_lon?: number | null;
  distancia_m?: number | null;
  ubicacion_pausada?: boolean;
}

export interface RutaSalida {
  ruta?: [number, number][] | null;
  calles?: [number, number][][] | null;
  distancia_m?: number | null;
  tienda_lat?: number | null;
  tienda_lon?: number | null;
}

export interface Mensaje {
  id: number;
  de: 'tienda' | 'repartidor';
  texto: string;
  creado: string;
  leido?: boolean;
}

export interface ResumenSalidaGuardado {
  entregadas: number;
  noEntregadas: number;
  plataCobrada: number;
  ganancia?: number;
}

export interface PedidoCliente {
  tienda: string;
  nombre: string;
  estado: 'preparando' | 'en_camino' | 'entregado' | 'no_entregado';
  faltan_antes: number;
  repartidor: string;
  destino: { lat: number; lon: number } | null;
  moto: { lat: number; lon: number; rumbo: number | null; hora: string } | null;
  /** Lo que le falta a la moto hasta la casa, por las calles (solo si este cliente es el siguiente). */
  camino?: [number, number][] | null;
  ubicacion_pausada: boolean;
  entregada_en: string | null;
}

export type RespuestaPedidoCodigo =
  | { tipo: 'exito'; data: PedidoCliente }
  | { tipo: 'espera' }
  | { tipo: 'no_encontrado' };

export interface SalidaResumen {
  codigo: string;
  tienda?: string;
  estado?: 'asignada' | 'en_curso' | 'terminada' | string;
  aceptada?: boolean;
  rechazada?: boolean;
  entregas_total?: number;
  entregas_restantes?: number;
  entregadas?: number;
  no_entregadas?: number;
  total_cobrar?: number;
  plata_cobrada?: number;
  hora?: string;
  creada?: string;
  terminada_en?: string;
  regresando?: boolean;
  resultado?: string; // Terminada / No la tomaste / Venció
}

export interface RespuestaMisSalidas {
  nombre: string;
  disponible?: boolean;
  otro_dispositivo?: boolean;
  salidas?: SalidaResumen[];
}
