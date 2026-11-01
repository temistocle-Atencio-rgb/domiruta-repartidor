import React, { useState } from 'react';
import { Parada } from '../types.ts';
import { formatearPesos } from '../supabase.ts';
import { MessageSquare, MapPin, X } from 'lucide-react';

interface PantallaAceptarSalidaProps {
  tienda: string;
  paradas: Parada[];
  cargandoRespuesta: boolean;
  onAceptar: () => Promise<void>;
  onRechazar: (motivo: string) => Promise<void>;
  onAbrirMensajes: () => void;
  mensajesNuevos: number;
}

const MOTIVOS_RECHAZO = [
  'Estoy ocupado',
  'Muy lejos',
  'No tengo moto ahora',
  'Otro',
] as const;

export const PantallaAceptarSalida: React.FC<PantallaAceptarSalidaProps> = ({
  tienda,
  paradas,
  cargandoRespuesta,
  onAceptar,
  onRechazar,
  onAbrirMensajes,
  mensajesNuevos,
}) => {
  const [hojaRechazoAbierta, setHojaRechazoAbierta] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('Estoy ocupado');
  const [motivoOtro, setMotivoOtro] = useState<string>('');

  const totalEntregas = paradas.length;
  const totalCobrar = paradas.reduce((sum, p) => sum + (p.cobrar || 0), 0);

  // Lista corta de direcciones (máximo 5; si hay más, "y N más")
  const direccionesAMostrar = paradas.slice(0, 5);
  const direccionesRestantes = totalEntregas > 5 ? totalEntregas - 5 : 0;

  const tituloTienda = tienda && tienda.trim().length > 0
    ? `${tienda.trim()} te asignó una salida`
    : 'La tienda te asignó una salida';

  const handleConfirmarRechazo = async () => {
    let motivoFinal = motivoSeleccionado;
    if (motivoSeleccionado === 'Otro') {
      motivoFinal = motivoOtro.trim().length > 0 ? motivoOtro.trim() : 'Otro';
    }
    await onRechazar(motivoFinal);
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col">
      {/* Barra superior en azul profundo con logo DomiRuta y botón de mensajes */}
      <header className="bg-[#003A73] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
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
          <span className="font-poppins font-bold text-base text-white">
            Domi<span className="text-[#F28C1B]">Ruta</span> Repartidor
          </span>
        </div>

        {/* Botón de mensajes habilitado antes de aceptar */}
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

      {/* Contenido principal centrado */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col justify-center space-y-4">
        {/* Cubo de DomiRuta e información principal */}
        <div className="text-center space-y-2 pt-2">
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
          <h1 className="font-poppins font-bold text-[20px] text-[#003A73] leading-snug m-0">
            {tituloTienda}
          </h1>
        </div>

        {/* Tarjeta blanca con resumen de la salida */}
        <section
          aria-label="Resumen de la salida"
          className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-[#E3E7EC] pb-3">
            <div>
              <span className="block font-poppins font-bold text-[18px] text-[#1F2933]">
                {totalEntregas} {totalEntregas === 1 ? 'entrega' : 'entregas'}
              </span>
              <span className="font-inter text-xs text-[#5B6670]">
                Ruta asignada
              </span>
            </div>
            <div className="text-right">
              <span className="block font-poppins font-bold text-[18px] text-[#003A73]">
                Cobras en total {formatearPesos(totalCobrar)}
              </span>
              <span className="font-inter text-xs text-[#5B6670]">
                A recaudar en ruta
              </span>
            </div>
          </div>

          {/* Lista corta de direcciones */}
          <div className="space-y-2 pt-1">
            <span className="font-inter text-xs font-semibold text-[#5B6670] uppercase tracking-wider block">
              Paradas:
            </span>
            <ul className="space-y-1.5 list-none m-0 p-0">
              {direccionesAMostrar.map((parada) => (
                <li
                  key={parada.id}
                  className="font-inter text-[13.5px] text-[#1F2933] flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-[#005198] flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="truncate">
                    <strong className="font-medium text-[#1F2933]">{parada.nombre}</strong> · {parada.direccion}
                  </span>
                </li>
              ))}
            </ul>

            {direccionesRestantes > 0 && (
              <p className="font-inter text-[13px] text-[#5B6670] italic m-0 pt-1 pl-6">
                y {direccionesRestantes} más
              </p>
            )}
          </div>
        </section>

        {/* Botones de acción */}
        <div className="space-y-2.5 pt-2">
          {/* Botón naranja a todo el ancho: "Acepto" */}
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

          {/* Botón con borde: "No puedo" */}
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
