import React from 'react';
import { RefreshCw, MessageSquare, MapPin } from 'lucide-react';

interface HeaderProps {
  tiendaNombre?: string | null;
  entregadas: number;
  total: number;
  cargando: boolean;
  onRecargar: () => void;
  codigo: string;
  mensajesNuevos: number;
  onAbrirMensajes: () => void;
  ubicacionActiva: boolean;
  onAlternarUbicacion: () => void;
  onVolverAMisSalidas?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tiendaNombre,
  entregadas,
  total,
  cargando,
  onRecargar,
  mensajesNuevos,
  onAbrirMensajes,
  ubicacionActiva,
  onAlternarUbicacion,
  onVolverAMisSalidas,
}) => {
  const nombreParaMostrar =
    tiendaNombre && tiendaNombre.trim().length > 0
      ? tiendaNombre.trim()
      : 'DomiRuta Repartidor';

  return (
    <header className="bg-[#003A73] text-white pt-2.5 pb-3 px-4 sticky top-0 z-30 shadow-md">
      {/* Fila 1: Logo, Nombre de la tienda y Acciones (Mensajes, Recargar) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {onVolverAMisSalidas && (
            <button
              type="button"
              onClick={onVolverAMisSalidas}
              className="min-h-[40px] px-2 py-1 flex items-center text-white/90 hover:text-white font-poppins text-xs font-medium rounded-[5px] hover:bg-white/10 transition-colors cursor-pointer select-none flex-shrink-0"
              title="Volver a Mis salidas"
            >
              ‹ Mis salidas
            </button>
          )}
          {/* Isotipo: Cubo isométrico versión blanca */}
          <svg
            className="w-5 h-6 flex-shrink-0"
            viewBox="0 0 259.8 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <polygon fill="#FFFFFF" points="0,75 129.9,0 259.8,75 129.9,150" />
            <polygon fill="#FFFFFF" fillOpacity="0.8" points="0,75 129.9,150 129.9,300 0,225" />
            <polygon fill="#FFFFFF" fillOpacity="0.6" points="129.9,150 259.8,75 259.8,225 129.9,300" />
          </svg>
          <div className="min-w-0">
            <span className="font-poppins font-bold text-base text-white tracking-tight truncate block">
              {nombreParaMostrar}
            </span>
          </div>
        </div>

        {/* Acciones en la cabecera */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Botón de Mensajes con indicador naranja */}
          <button
            type="button"
            onClick={onAbrirMensajes}
            className="relative min-h-[40px] px-2.5 py-1.5 flex items-center gap-1.5 rounded-[5px] text-xs font-inter font-medium text-white/95 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
            aria-label={`Mensajes con la tienda${mensajesNuevos > 0 ? `, ${mensajesNuevos} nuevos` : ''}`}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" strokeWidth={2} />
              {mensajesNuevos > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#F28C1B] text-[#1F2933] font-poppins font-bold text-[10.5px] w-4 h-4 rounded-full flex items-center justify-center leading-none shadow-xs">
                  {mensajesNuevos > 9 ? '9+' : mensajesNuevos}
                </span>
              )}
            </div>
            <span className="hidden xs:inline">Mensajes</span>
          </button>

          {/* Botón de recarga manual */}
          <button
            type="button"
            onClick={onRecargar}
            disabled={cargando}
            className="min-h-[40px] px-2 py-1.5 flex items-center rounded-[5px] text-xs font-inter text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors disabled:opacity-60 cursor-pointer"
            title="Recargar entregas"
            aria-label="Recargar entregas"
          >
            <RefreshCw
              className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Fila 2: Progreso de entregas e interruptor discreto de Compartir ubicación */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-inter text-[13.5px] text-white/95 m-0 font-medium">
            {total > 0 ? `${entregadas} de ${total} entregadas` : 'Cargando paradas...'}
          </p>
        </div>

        {/* Interruptor discreto: "Compartir mi ubicación" */}
        <button
          type="button"
          onClick={onAlternarUbicacion}
          className="min-h-[38px] px-2.5 py-1 rounded-[5px] flex items-center gap-2 bg-black/15 hover:bg-black/25 active:bg-black/30 transition-colors cursor-pointer text-left"
          title={ubicacionActiva ? 'Toca para pausar la ubicación' : 'Toca para reanudar la ubicación'}
          aria-label={ubicacionActiva ? 'Compartir ubicación activo' : 'Compartir ubicación pausado'}
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              ubicacionActiva ? 'bg-[#2E9E5B] animate-pulse' : 'bg-[#B03030]'
            }`}
          />
          <span className="font-inter text-[12px] font-medium text-white/90">
            {ubicacionActiva ? 'Compartiendo ubicación' : 'Ubicación pausada'}
          </span>
        </button>
      </div>
    </header>
  );
};
