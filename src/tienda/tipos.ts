export interface Tienda {
  nombre: string;
  logo: string | null;
  direccion: string;
  telefono: string;
  horario: string;
  abierta: boolean;
  domicilio: number;
  minimo: number;
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
}
export interface Catalogo { tienda: Tienda; productos: Producto[] }
export interface ItemPedido { id: number; cantidad: number }
export type Entrega = 'domicilio' | 'retiro';
export interface PedidoNuevo {
  nombre: string; celular: string; correo: string;
  entrega: Entrega;
  direccion: string; referencia: string; lat: number | null; lon: number | null;
  pago: 'efectivo' | 'transferencia'; pagaCon: number | null;
  nota: string; items: ItemPedido[];
}
export type EstadoPedidoTexto = 'nuevo' | 'aceptado' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
export interface EstadoPedido {
  codigo: string; estado: EstadoPedidoTexto; total: number; creado: string;
  tienda: string; motivo: string; entrega: Entrega;
}
/** El carrito: id del producto → cantidad */
export type Carrito = Record<number, number>;
