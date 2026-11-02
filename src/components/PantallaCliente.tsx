import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PedidoCliente } from '../types.ts';
import { verPedido, verPedidoCodigo, formatearHoraEntrega } from '../supabase.ts';
import { MapaCliente } from './MapaCliente.tsx';
import { CheckCircle2, AlertOctagon, Package } from 'lucide-react';

interface PantallaClienteProps {
  enlace?: string | null;
  consultaInicial?: { codigo: string; ultimos4: string } | null;
  pedidoInicial?: PedidoCliente | null;
  onVolverAConsulta?: () => void;
}

export const PantallaCliente: React.FC<PantallaClienteProps> = ({
  enlace,
  consultaInicial,
  pedidoInicial,
}) => {
  const [pedido, setPedido] = useState<PedidoCliente | null>(pedidoInicial || null);
  const [cargandoInicial, setCargandoInicial] = useState<boolean>(!pedidoInicial);
  const [enlaceInvalido, setEnlaceInvalido] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const intervaloRef = useRef<number | null>(null);
  const pedidoRef = useRef<PedidoCliente | null>(pedido);
  pedidoRef.current = pedido;

  // Detección de conectividad a internet
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Función para consultar la última información del pedido
  const recargarPedido = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) {
      return; // Pausado mientras la pestaña esté oculta
    }

    try {
      if (enlace) {
        const data = await verPedido(enlace);
        if (data) {
          setPedido(data);
          setEnlaceInvalido(false);
        } else if (!pedidoRef.current) {
          setEnlaceInvalido(true);
        }
      } else if (consultaInicial) {
        const res = await verPedidoCodigo(consultaInicial.codigo, consultaInicial.ultimos4);
        if (res.tipo === 'exito') {
          setPedido(res.data);
        }
      }
    } catch {
      // Si falla la red, el banner "Sin internet" o el estado actual se conserva
    } finally {
      setCargandoInicial(false);
    }
  }, [enlace, consultaInicial]);

  // Carga inicial
  useEffect(() => {
    recargarPedido();
  }, [recargarPedido]);

  // Ciclo de actualización automática cada 10 segundos
  useEffect(() => {
    const estadoActual = pedido?.estado;
    const esFinal = estadoActual === 'entregado' || estadoActual === 'no_entregado';

    // Si ya terminó la entrega o el enlace no es válido, detenemos el polling
    if (esFinal || enlaceInvalido) {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
      return;
    }

    // Intervalo de 10 segundos
    const iniciarPolling = () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      intervaloRef.current = window.setInterval(() => {
        recargarPedido();
      }, 10000);
    };

    iniciarPolling();

    // Pausar cuando la pestaña esté oculta y consultar inmediatamente al volver
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervaloRef.current) {
          clearInterval(intervaloRef.current);
          intervaloRef.current = null;
        }
      } else {
        recargarPedido();
        iniciarPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pedido?.estado, enlaceInvalido, recargarPedido]);

  // Si no se encuentra o el enlace está vencido
  if (!cargandoInicial && enlaceInvalido) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-3">
          <div className="flex justify-center">
            <svg
              className="w-12 h-14"
              viewBox="0 0 259.8 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
          </div>
          <h1 className="font-poppins font-bold text-[18px] text-[#003A73] m-0 leading-tight">
            Enlace no disponible
          </h1>
          <p className="font-inter text-[14px] text-[#5B6670] leading-relaxed m-0">
            Este enlace ya no está disponible. Si tienes dudas, escríbele a la tienda.
          </p>
        </div>
      </main>
    );
  }

  // Pantalla de carga inicial
  if (cargandoInicial && !pedido) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-8 text-center space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-10 h-12 animate-pulse"
              viewBox="0 0 259.8 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
          </div>
          <p className="font-inter text-[14.5px] text-[#5B6670] m-0">
            Cargando estado de tu pedido…
          </p>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return null;
  }

  const { tienda, nombre, estado, faltan_antes, repartidor, destino, moto, ubicacion_pausada, entregada_en } = pedido;

  // Renderizar estado con texto destacado en su color (sin fondo ni píldora según manual de marca)
  const renderDetalleEstado = () => {
    switch (estado) {
      case 'preparando':
        return (
          <div className="space-y-1">
            <h2 className="font-poppins font-bold text-[20px] text-[#003A73] leading-snug m-0">
              Estamos preparando tu pedido
            </h2>
            <p className="font-inter text-[14px] text-[#5B6670] m-0">
              Pronto saldrá con el repartidor hacia tu dirección.
            </p>
          </div>
        );

      case 'en_camino':
        if (faltan_antes > 0) {
          const textoFaltan =
            faltan_antes === 1
              ? 'Falta 1 entrega antes de la tuya'
              : `Faltan ${faltan_antes} entregas antes de la tuya`;
          return (
            <div className="space-y-1">
              <h2 className="font-poppins font-bold text-[20px] text-[#005198] leading-snug m-0">
                Tu pedido va en camino
              </h2>
              <p className="font-inter text-[14.5px] text-[#1F2933] font-medium m-0">
                {textoFaltan}
              </p>
            </div>
          );
        }
        return (
          <div className="space-y-1">
            <h2 className="font-poppins font-bold text-[20px] text-[#003A73] leading-snug m-0">
              ¡Eres el siguiente!
            </h2>
            <p className="font-inter text-[15px] text-[#1F2933] font-medium m-0">
              {repartidor ? `${repartidor} va para tu casa` : 'El repartidor va para tu casa'}
            </p>
          </div>
        );

      case 'entregado': {
        const horaTexto = formatearHoraEntrega(entregada_en);
        const mensajeEntregado = horaTexto
          ? `Entregado a las ${horaTexto}`
          : 'Pedido entregado';

        return (
          <div className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#1E7A44]/10 text-[#1E7A44] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-[#1E7A44]" strokeWidth={2.2} />
            </div>
            {/* Texto en verde #1E7A44 sin fondo según manual de marca */}
            <h2 className="font-poppins font-bold text-[22px] text-[#1E7A44] leading-snug m-0">
              {mensajeEntregado}
            </h2>
            <p className="font-inter text-[14.5px] text-[#5B6670] m-0">
              ¡Gracias por tu compra en {tienda || 'la tienda'}! Esperamos que lo disfrutes.
            </p>
          </div>
        );
      }

      case 'no_entregado':
        return (
          <div className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#B03030]/10 text-[#B03030] flex items-center justify-center mx-auto">
              <AlertOctagon className="w-7 h-7 text-[#B03030]" strokeWidth={2.2} />
            </div>
            {/* Texto en rojo #B03030 sin fondo según manual de marca */}
            <h2 className="font-poppins font-bold text-[20px] text-[#B03030] leading-snug m-0">
              No pudimos entregar tu pedido
            </h2>
            <p className="font-inter text-[14.5px] text-[#5B6670] leading-relaxed m-0">
              La tienda se comunicará contigo para acordar la entrega.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col antialiased">
      {/* Barra superior azul profundo con el nombre de la tienda */}
      <header className="bg-[#003A73] text-white px-4 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-7 flex-shrink-0">
            <svg
              className="w-full h-full"
              viewBox="0 0 259.8 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#FFFFFF" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#E3E7EC" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
          </div>
          <h1 className="font-poppins font-semibold text-[16px] text-white tracking-wide truncate m-0">
            {tienda || 'DomiRuta'}
          </h1>
        </div>
      </header>

      {/* Aviso de sin conexión */}
      {!isOnline && (
        <aside
          role="status"
          className="bg-[#B03030] text-white py-1.5 px-4 text-center text-xs font-poppins font-medium shadow-sm z-20 sticky top-14"
        >
          Sin internet: mostramos lo último que sabemos
        </aside>
      )}

      {/* Cuerpo principal */}
      <main className="flex-1 w-full flex flex-col">
        {/* Encabezado con saludo */}
        <section className="bg-white border-b border-[#E3E7EC] px-4 py-4">
          <div className="max-w-md mx-auto w-full space-y-2">
            <p className="font-poppins font-bold text-[22px] text-[#003A73] leading-tight m-0">
              Hola, {nombre}
            </p>
            {renderDetalleEstado()}
          </div>
        </section>

        {/* Mapa Leaflet: SOLO cuando estado es 'en_camino' */}
        {estado === 'en_camino' && (
          <section className="w-full flex-1 flex flex-col">
            <MapaCliente
              destino={destino}
              moto={moto}
              ubicacionPausada={ubicacion_pausada}
              className="h-[52vh] min-h-[260px] w-full"
            />
          </section>
        )}

        {/* Tarjeta de preparación cuando el estado es 'preparando' */}
        {estado === 'preparando' && (
          <div className="p-4 max-w-md mx-auto w-full">
            <div className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#005198]/10 text-[#005198] flex items-center justify-center mx-auto">
                <Package className="w-6 h-6 text-[#005198]" strokeWidth={2} />
              </div>
              <p className="font-inter text-[14px] text-[#5B6670] leading-relaxed m-0">
                Apenas el repartidor tome la salida y arranque hacia tu casa, verás el mapa con su recorrido en tiempo real aquí mismo.
              </p>
            </div>
          </div>
        )}

        {/* Espacio inferior para estados finales */}
        {(estado === 'entregado' || estado === 'no_entregado') && (
          <div className="p-4 max-w-md mx-auto w-full" />
        )}
      </main>
    </div>
  );
};
