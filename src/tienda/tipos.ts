export interface Tienda {
  nombre: string;
  logo: string | null;
  direccion: string;
  telefono: string;
  horario: string;
  abierta: boolean;
  domicilio: number;
  minimo: number;
  pagos?: string[];            // medios de pago activos en DomiRuta (efectivo, nequi, ...)
}
export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  marca: string;
  categoria: string;
  precio: number;
  foto: string | null;
  disponible: boolean;
  codigo?: string;             // código de barras (como el PLU del D1)
  caracteristicas?: { n: string; v: string }[];  // las de la ficha en DomiRuta
}
export interface Catalogo { tienda: Tienda; productos: Producto[] }
export interface ItemPedido { id: number; cantidad: number }
export type Entrega = 'domicilio' | 'retiro';
export interface PedidoNuevo {
  nombre: string; celular: string; correo: string;
  entrega: Entrega;
  direccion: string; referencia: string; lat: number | null; lon: number | null;
  pago: string; pagaCon: number | null;
  nota: string; items: ItemPedido[];
}
export type EstadoPedidoTexto = 'nuevo' | 'aceptado' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
export interface EstadoPedido {
  codigo: string; estado: EstadoPedidoTexto; total: number; creado: string;
  tienda: string; motivo: string; entrega: Entrega;
  pago?: string; pagado?: boolean; comprobante?: boolean;
}
/** El carrito: id del producto → cantidad */
export type Carrito = Record<number, number>;
