import React, { useState } from 'react';
import { Parada, RutaSalida } from '../types.ts';
import { formatearPesos } from '../supabase.ts';
import { MapaRuta } from './MapaRuta.tsx';
import { distanciaHaversine } from '../utils/geo.ts';
import { MessageSquare, MapPin, X, AlertTriangle } from 'lucide-react';

interface PantallaAceptarSalidaProps {
  tienda: string;
  venceEn?: string | null;
  vencida?: boolean;
  distanciaM?: number | null;
  tiendaLat?: number | null;
  tiendaLon?: number | null;
  posicionUsuarioGps?: { lat: number; lon: number } | null;
  paradas: Parada[];
  rutaData?: RutaSalida | null;
  cargandoRespuesta: boolean;
  onAceptar: () => Promise<void>;
  onRechazar: (motivo: string) => Promise<void>;
  onAbrirMensajes: () => void;
  mensajesNuevos: number;
  onVolverAMisSalidas?: () => void;
}

const MOTIVOS_RECHAZO = [
  'Estoy ocupado',
  'Muy lejos',
  'No tengo moto ahora',
  'Otro',
] as const;

export const PantallaAceptarSalida: React.FC<PantallaAceptarSalidaProps> = ({
  tienda,
  venceEn,
  vencida = false,
  distanciaM,
  tiendaLat,
  tiendaLon,
  posicionUsuarioGps,
  paradas,
  rutaData,
  cargandoRespuesta,
  onAceptar,
  onRechazar,
  onAbrirMensajes,
  mensajesNuevos,
  onVolverAMisSalidas,
}) => {
  const [hojaRechazoAbierta, setHojaRechazoAbierta] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('Estoy ocupado');
  const [motivoOtro, setMotivoOtro] = useState<string>('');

  // Si venció la salida
  if (vencida) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#B03030]/10 text-[#B03030] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-[#B03030]" strokeWidth={2} />
          </div>
          <h1 className="font-poppins font-bold text-[19px] text-[#003A73] leading-snug m-0">
            Esta salida ya no está disponible
          </h1>
          <p className="font-inter text-[14px] text-[#5B6670] m-0">
            El tiempo para responder venció o la salida fue asignada a otro repartidor.
          </p>
        </div>
      </main>
    );
  }

  const totalEntregas = paradas.length;
  const totalCobrar = paradas.reduce((sum, p) => sum + (p.cobrar || 0), 0);
  const direccionesAMostrar = paradas.slice(0, 5);
  const direccionesRestantes = totalEntregas > 5 ? totalEntregas - 5 : 0;

  // Distancia total en km
  const metros = distanciaM ?? rutaData?.distancia_m;
  const textoDistancia =
    typeof metros === 'number' && metros > 0
      ? `${(metros / 1000).toFixed(1).replace('.', ',')} km`
      : null;

  // Hora de vencimiento (ej. 10:40 a. m.)
  let textoVenceEn: string | null = null;
  if (venceEn) {
    try {
      const fecha = new Date(venceEn);
      textoVenceEn = new Intl.DateTimeFormat('es-CO', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(fecha);
    } catch {
      // Ignorar error de parseo
    }
  }

  // Distancia del repartidor a la tienda en línea recta si ya hay GPS
  let textoDistanciaRepartidorTienda: string | null = null;
  const tLat = tiendaLat ?? rutaData?.tienda_lat;
  const tLon = tiendaLon ?? rutaData?.tienda_lon;
  if (
    posicionUsuarioGps &&
    typeof tLat === 'number' &&
    typeof tLon === 'number'
  ) {
    const distMetros = distanciaHaversine(
      posicionUsuarioGps.lat,
      posicionUsuarioGps.lon,
      tLat,
      tLon
    );
    textoDistanciaRepartidorTienda = `Estás a ${(distMetros / 1000).toFixed(1).replace('.', ',')} km de la tienda`;
  }

  const nombreTienda = tienda && tienda.trim().length > 0 ? tienda.trim() : 'La tienda';

  const handleConfirmarRechazo = async () => {
    let motivoFinal = motivoSeleccionado;
    if (motivoSeleccionado === 'Otro') {
      motivoFinal = motivoOtro.trim().length > 0 ? motivoOtro.trim() : 'Otro';
    }
    await onRechazar(motivoFinal);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col">
      {/* Barra superior en azul profundo #003A73 con nombre de la tienda */}
      <header className="bg-[#003A73] text-white px-4 py-2.5 flex items-center justify-between shadow-md z-10 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {onVolverAMisSalidas && (
            <button
              type="button"
              onClick={onVolverAMisSalidas}
              className="min-h-[40px] px-2 py-1 flex items-center text-white/90 hover:text-white font-poppins text-xs font-medium rounded-[5px] hover:bg-white/10 transition-colors cursor-pointer select-none flex-shrink-0 mr-1"
              title="Volver a Mis salidas"
            >
              ‹ Mis salidas
            </button>
          )}
          {/* Cubo isométrico oficial versión blanca */}
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
          <span className="font-poppins font-bold text-base text-white truncate max-w-[180px]">
            {nombreTienda}
          </span>
        </div>

        {/* Botón de mensajes con la tienda habilitado antes de aceptar */}
        <button
          type="button"
          onClick={onAbrirMensajes}
          className="relative min-h-[40px] px-2.5 py-1.5 flex items-center gap-1.5 rounded-[5px] text-xs font-inter font-medium text-white/95 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
          aria-label="Abrir mensajes con la tienda"
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
      </header>

      {/* Mapa arriba (alto ~45 % de la pantalla) con la ruta en azul #005198 5px, tienda y paradas numeradas */}
      <MapaRuta
        paradas={paradas}
        rutaSalidaData={rutaData}
        tiendaLat={tLat}
        tiendaLon={tLon}
        className="h-[44vh] min-h-[240px] w-full flex-shrink-0"
      />

      {/* Contenido inferior con resumen y botones */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-3.5">
        <div>
          <h1 className="font-poppins font-bold text-[20px] text-[#003A73] leading-snug m-0">
            <strong>{nombreTienda}</strong> te asignó una salida
          </h1>
          {textoVenceEn && (
            <p className="font-inter text-xs text-[#5B6670] mt-0.5 mb-0 font-medium">
              Responde antes de las {textoVenceEn}
            </p>
          )}
          {textoDistanciaRepartidorTienda && (
            <p className="font-inter text-xs text-[#005198] mt-0.5 mb-0 font-medium">
              {textoDistanciaRepartidorTienda}
            </p>
          )}
        </div>

        {/* Tarjeta blanca con resumen de la salida */}
        <section
          aria-label="Resumen de la salida"
          className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#E3E7EC] pb-2.5">
            <div>
              <span className="block font-poppins font-bold text-[18px] text-[#003A73]">
                COBRAR {formatearPesos(totalCobrar)}
              </span>
              <span className="font-inter text-xs text-[#5B6670]">
                {totalEntregas} {totalEntregas === 1 ? 'entrega' : 'entregas'}
                {textoDistancia ? ` · ${textoDistancia}` : ''}
              </span>
            </div>
          </div>

          {/* Lista corta de paradas */}
          <div className="space-y-2 pt-0.5">
            <span className="font-inter text-xs font-semibold text-[#5B6670] uppercase tracking-wider block">
              Paradas:
            </span>
            <ul className="space-y-2 list-none m-0 p-0">
              {direccionesAMostrar.map((parada) => (
                <li
                  key={parada.id}
                  className="font-inter text-[13.5px] text-[#1F2933] flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-[#005198] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="min-w-0 flex-1 leading-snug break-words">
                    <span className="font-semibold text-[#1F2933]">
                      #{parada.orden} {parada.nombre}
                    </span>
                    <span className="text-[#5B6670] mx-1">·</span>
                    <span className="text-[#1F2933] font-normal">{parada.direccion}</span>
                  </div>
                </li>
              ))}
            </ul>

            {direccionesRestantes > 0 && (
              <p className="font-inter text-[12.5px] text-[#5B6670] italic m-0 pt-0.5 pl-6">
                y {direccionesRestantes} más
              </p>
            )}
          </div>
        </section>

        {/* Botones de acción: UN solo botón naranja principal a todo el ancho */}
        <div className="space-y-2 pt-1 pb-4">
          <button
            type="button"
            onClick={onAceptar}
            disabled={cargandoRespuesta}
            className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07f15] active:bg-[#cc710e] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[16px] flex items-center justify-center transition-colors disabled:opacity-60 cursor-pointer shadow-sm select-none"
          >
            {cargandoRespuesta ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#1F2933] border-t-transparent rounded-full animate-spin" />
                Aceptando...
              </span>
            ) : (
              'Acepto'
            )}
          </button>

          <button
            type="button"
            onClick={() => setHojaRechazoAbierta(true)}
            disabled={cargandoRespuesta}
            className="w-full h-[48px] bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#5B6670] hover:text-[#1F2933] border border-[#C9CFD6] rounded-[5px] font-poppins font-medium text-[15px] flex items-center justify-center transition-colors disabled:opacity-60 cursor-pointer"
          >
            No puedo
          </button>
        </div>
      </main>

      {/* Hoja modal para rechazar salida */}
      {hojaRechazoAbierta && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-md rounded-t-[10px] shadow-[0_-4px_20px_rgba(0,0,0,0.18)] p-4 space-y-3.5 border-t border-[#E3E7EC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#E3E7EC] pb-2.5">
              <div>
                <h2 className="font-poppins font-bold text-[17px] text-[#003A73] m-0 leading-tight">
                  ¿Seguro que no puedes llevarla?
                </h2>
                <p className="font-inter text-[13.5px] text-[#5B6670] mt-1 mb-0">
                  La tienda buscará a otro repartidor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHojaRechazoAbierta(false)}
                disabled={cargandoRespuesta}
                className="w-9 h-9 flex items-center justify-center text-[#5B6670] hover:text-[#1F2933] rounded-[5px] cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Motivos rápidos */}
            <div className="space-y-2">
              {MOTIVOS_RECHAZO.map((motivo) => {
                const seleccionado = motivoSeleccionado === motivo;
                return (
                  <label
                    key={motivo}
                    className={`min-h-[44px] px-3.5 py-2 flex items-center justify-between rounded-[5px] border cursor-pointer transition-colors ${
                      seleccionado
                        ? 'border-[#005198] bg-[#005198]/5 text-[#003A73]'
                        : 'border-[#E3E7EC] hover:bg-[#F2F4F7] text-[#1F2933]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="motivo-rechazo"
                        value={motivo}
                        checked={seleccionado}
                        onChange={() => setMotivoSeleccionado(motivo)}
                        className="w-4 h-4 text-[#005198] accent-[#005198] cursor-pointer"
                      />
                      <span className="font-inter text-[14px] font-medium">{motivo}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Campo si seleccionó "Otro" */}
            {motivoSeleccionado === 'Otro' && (
              <div className="pt-1">
                <input
                  type="text"
                  maxLength={100}
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  placeholder="Escribe el motivo..."
                  autoFocus
                  className="w-full h-[40px] px-3 bg-white border border-[#C9CFD6] rounded-[5px] font-inter text-[14px] text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#005198]"
                />
              </div>
            )}

            {/* Botones de acción */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmarRechazo}
                disabled={cargandoRespuesta}
                className="w-full h-[48px] bg-[#B03030] hover:bg-[#972727] active:bg-[#7e1f1f] text-white rounded-[5px] font-poppins font-semibold text-[15px] flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cargandoRespuesta ? 'Enviando...' : 'Sí, no puedo'}
              </button>
              <button
                type="button"
                onClick={() => setHojaRechazoAbierta(false)}
                disabled={cargandoRespuesta}
                className="w-full h-[44px] bg-transparent hover:bg-black/5 text-[#005198] rounded-[5px] font-poppins font-medium text-[14px] flex items-center justify-center cursor-pointer"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
