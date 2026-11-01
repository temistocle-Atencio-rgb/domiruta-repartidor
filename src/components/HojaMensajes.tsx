import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Mensaje } from '../types.ts';
import { ArrowLeft, ArrowDown, Send, Check, CheckCheck, Clock } from 'lucide-react';

interface HojaMensajesProps {
  abierta: boolean;
  mensajes: Mensaje[];
  horaSalidaTexto?: string;
  onCerrar: () => void;
  onEnviarMensaje: (texto: string) => Promise<boolean>;
}

interface MensajePendiente {
  idTemp: string;
  texto: string;
  creado: string;
  estado: 'enviando' | 'error';
}

const RESPUESTAS_RAPIDAS = [
  'No encuentro la dirección',
  'El cliente no contesta',
  'Necesito cambio',
  'Ya voy de regreso',
] as const;

export const HojaMensajes: React.FC<HojaMensajesProps> = ({
  abierta,
  mensajes,
  horaSalidaTexto = 'Salida activa',
  onCerrar,
  onEnviarMensaje,
}) => {
  const [texto, setTexto] = useState('');
  const [mensajesPendientes, setMensajesPendientes] = useState<MensajePendiente[]>([]);
  const [mensajesNuevosAbajo, setMensajesNuevosAbajo] = useState(0);
  const [estaAlFinal, setEstaAlFinal] = useState(true);

  const contenedorScrollRef = useRef<HTMLDivElement>(null);
  const ultimoMensajeRef = useRef<HTMLDivElement>(null);
  const totalMensajesAnteriorRef = useRef<number>(mensajes.length);

  // Formato de hora (10:42 a. m.)
  const formatearHora = (isoDate: string): string => {
    try {
      const fecha = new Date(isoDate);
      return new Intl.DateTimeFormat('es-CO', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(fecha);
    } catch {
      return '';
    }
  };

  // Separador de día (Hoy, Ayer o Fecha)
  const obtenerEtiquetaDia = (isoDate: string): string => {
    try {
      const fecha = new Date(isoDate);
      const hoy = new Date();
      if (
        fecha.getDate() === hoy.getDate() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getFullYear() === hoy.getFullYear()
      ) {
        return 'Hoy';
      }
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      if (
        fecha.getDate() === ayer.getDate() &&
        fecha.getMonth() === ayer.getMonth() &&
        fecha.getFullYear() === ayer.getFullYear()
      ) {
        return 'Ayer';
      }
      return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
      }).format(fecha);
    } catch {
      return 'Hoy';
    }
  };

  const bajarAlFinal = (suave = true) => {
    if (contenedorScrollRef.current) {
      contenedorScrollRef.current.scrollTo({
        top: contenedorScrollRef.current.scrollHeight,
        behavior: suave ? 'smooth' : 'auto',
      });
      setEstaAlFinal(true);
      setMensajesNuevosAbajo(0);
    }
  };

  // Scroll al final al abrir el chat
  useLayoutEffect(() => {
    if (abierta) {
      setTimeout(() => bajarAlFinal(false), 50);
    }
  }, [abierta]);

  // Manejo de mensajes entrantes y scroll inteligente
  useEffect(() => {
    if (!abierta) return;

    const anteriores = totalMensajesAnteriorRef.current;
    const actuales = mensajes.length;

    if (actuales > anteriores) {
      const nuevos = actuales - anteriores;
      if (estaAlFinal) {
        bajarAlFinal(true);
      } else {
        setMensajesNuevosAbajo((prev) => prev + nuevos);
      }
    }

    totalMensajesAnteriorRef.current = actuales;
  }, [mensajes, abierta, estaAlFinal]);

  // Detectar si el usuario scrolleó hacia arriba
  const handleScroll = () => {
    const el = contenedorScrollRef.current;
    if (!el) return;
    const distanciaDelFondo = el.scrollHeight - el.scrollTop - el.clientHeight;
    const cercaDelFondo = distanciaDelFondo < 60;
    setEstaAlFinal(cercaDelFondo);
    if (cercaDelFondo) {
      setMensajesNuevosAbajo(0);
    }
  };

  const enviarTexto = async (textoAEnviar: string) => {
    const limpio = textoAEnviar.trim();
    if (!limpio) return;

    const idTemp = `temp_${Date.now()}`;
    const pendiente: MensajePendiente = {
      idTemp,
      texto: limpio,
      creado: new Date().toISOString(),
      estado: 'enviando',
    };

    setMensajesPendientes((prev) => [...prev, pendiente]);
    setTexto('');
    setTimeout(() => bajarAlFinal(true), 40);

    const exito = await onEnviarMensaje(limpio);
    if (exito) {
      setMensajesPendientes((prev) => prev.filter((p) => p.idTemp !== idTemp));
    } else {
      setMensajesPendientes((prev) =>
        prev.map((p) => (p.idTemp === idTemp ? { ...p, estado: 'error' } : p))
      );
    }
  };

  const reintentarPendiente = async (idTemp: string, textoPendiente: string) => {
    setMensajesPendientes((prev) =>
      prev.map((p) => (p.idTemp === idTemp ? { ...p, estado: 'enviando' } : p))
    );
    const exito = await onEnviarMensaje(textoPendiente);
    if (exito) {
      setMensajesPendientes((prev) => prev.filter((p) => p.idTemp !== idTemp));
    } else {
      setMensajesPendientes((prev) =>
        prev.map((p) => (p.idTemp === idTemp ? { ...p, estado: 'error' } : p))
      );
    }
  };

  if (!abierta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#F2F4F7] animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Chat con la tienda"
    >
      {/* 1. Barra superior en azul profundo #003A73 */}
      <header className="bg-[#003A73] text-white px-3 py-2.5 flex items-center gap-3 shadow-md z-10 flex-shrink-0">
        {/* Flecha de volver */}
        <button
          type="button"
          onClick={onCerrar}
          className="w-10 h-10 -ml-1 rounded-[5px] flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
          aria-label="Volver a las entregas"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {/* Círculo blanco con el cubo de DomiRuta */}
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs">
          <svg
            className="w-5 h-6"
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

        {/* Nombre y subtítulo */}
        <div className="flex-1 min-w-0">
          <h1 className="font-poppins font-bold text-[16px] text-white leading-tight m-0 truncate">
            Tienda
          </h1>
          <p className="font-inter text-[12px] text-white/80 leading-tight mt-0.5 mb-0 truncate">
            {horaSalidaTexto}
          </p>
        </div>
      </header>

      {/* 2. Área de conversación con fondo #F2F4F7 */}
      <main
        ref={contenedorScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 relative"
      >
        {mensajes.length === 0 && mensajesPendientes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6">
            <div className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 max-w-xs shadow-xs">
              <p className="font-inter text-[14px] text-[#5B6670] m-0">
                Escribe un mensaje o toca una respuesta rápida para comunicarte directamente con la tienda.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Renderizar mensajes con separador de día y agrupación consecutiva */}
            {mensajes.map((m, index) => {
              const esMio = m.de === 'repartidor';
              const anterior = mensajes[index - 1];
              const esMismoRemitenteQueAnterior = anterior && anterior.de === m.de;

              // Calcular cambio de día
              const diaActual = obtenerEtiquetaDia(m.creado);
              const diaAnterior = anterior ? obtenerEtiquetaDia(anterior.creado) : null;
              const mostrarSeparadorDia = diaActual !== diaAnterior;

              return (
                <React.Fragment key={m.id}>
                  {/* Separador de día */}
                  {mostrarSeparadorDia && (
                    <div className="flex justify-center py-2.5">
                      <span className="px-3 py-1 bg-white border border-[#E3E7EC] rounded-[5px] text-[11px] font-inter text-[#5B6670] shadow-xs select-none">
                        {diaActual}
                      </span>
                    </div>
                  )}

                  {/* Fila del mensaje */}
                  <div
                    className={`flex ${esMio ? 'justify-end' : 'justify-start'} ${
                      esMismoRemitenteQueAnterior ? 'mt-1' : 'mt-2.5'
                    }`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-[5px] px-3.5 py-2 shadow-xs text-[15px] font-inter text-[#1F2933] break-words leading-relaxed ${
                        esMio
                          ? `bg-[#DCEBF7] border border-[#005198]/15 ${
                              !esMismoRemitenteQueAnterior ? 'rounded-tr-none' : ''
                            }`
                          : `bg-white border border-[#E3E7EC] ${
                              !esMismoRemitenteQueAnterior ? 'rounded-tl-none' : ''
                            }`
                      }`}
                    >
                      <p className="m-0 whitespace-pre-wrap">{m.texto}</p>

                      {/* Hora y chulos dentro de la burbuja abajo a la derecha */}
                      <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 select-none text-[11px] text-[#5B6670]">
                        <span>{formatearHora(m.creado)}</span>
                        {esMio && (
                          m.leido ? (
                            <span title="Leído por la tienda">
                              <CheckCheck className="w-3.5 h-3.5 text-[#005198]" strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span title="Enviado">
                              <Check className="w-3.5 h-3.5 text-[#5B6670]" strokeWidth={2} />
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Mensajes pendientes locales */}
            {mensajesPendientes.map((p) => (
              <div key={p.idTemp} className="flex justify-end mt-1">
                <div className="relative max-w-[80%] rounded-[5px] px-3.5 py-2 shadow-xs text-[15px] font-inter text-[#1F2933] break-words leading-relaxed bg-[#DCEBF7] border border-[#005198]/15">
                  <p className="m-0 whitespace-pre-wrap">{p.texto}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5 select-none text-[11px]">
                    {p.estado === 'enviando' ? (
                      <span className="flex items-center gap-1 text-[#5B6670]">
                        <span>{formatearHora(p.creado)}</span>
                        <Clock className="w-3 h-3 text-[#5B6670] animate-pulse" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reintentarPendiente(p.idTemp, p.texto)}
                        className="text-[#B03030] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>No se envió · Tocar para reintentar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={ultimoMensajeRef} />
      </main>

      {/* Botón flotante para bajar cuando el usuario ha subido */}
      {!estaAlFinal && (
        <button
          type="button"
          onClick={() => bajarAlFinal(true)}
          className="absolute right-4 bottom-32 z-20 w-11 h-11 rounded-full bg-white text-[#005198] border border-[#E3E7EC] shadow-md flex items-center justify-center hover:bg-[#F2F4F7] active:bg-[#E3E7EC] cursor-pointer"
          aria-label="Bajar al último mensaje"
        >
          <div className="relative flex items-center justify-center">
            <ArrowDown className="w-5 h-5 text-[#005198]" strokeWidth={2.5} />
            {mensajesNuevosAbajo > 0 && (
              <span className="absolute -top-3 -right-3 bg-[#005198] text-white font-poppins font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                {mensajesNuevosAbajo}
              </span>
            )}
          </div>
        </button>
      )}

      {/* 3. Respuestas rápidas en fila horizontal deslizable */}
      <div className="bg-white border-t border-[#E3E7EC] pt-2 px-3 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {RESPUESTAS_RAPIDAS.map((frase) => (
            <button
              key={frase}
              type="button"
              onClick={() => enviarTexto(frase)}
              className="h-[40px] px-3.5 bg-white hover:bg-[#F2F4F7] active:bg-[#E8F0F8] text-[#005198] border border-[#005198] rounded-[5px] font-poppins font-semibold text-[13px] whitespace-nowrap flex-shrink-0 flex items-center transition-colors cursor-pointer"
            >
              {frase}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Caja de escribir abajo y fija */}
      <footer className="bg-white border-t border-[#E3E7EC] p-3 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarTexto(texto);
          }}
          className="flex items-end gap-2.5 max-w-full"
        >
          <div className="flex-1 bg-white border border-[#C9CFD6] rounded-[5px] focus-within:ring-2 focus-within:ring-[#005198] focus-within:border-transparent px-3 py-2 flex items-center">
            <textarea
              rows={1}
              maxLength={300}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarTexto(texto);
                }
              }}
              placeholder="Escribe un mensaje"
              className="w-full bg-transparent resize-none font-inter text-[15px] text-[#1F2933] outline-none max-h-24 leading-snug placeholder:text-[#5B6670]/80"
              style={{ minHeight: '24px' }}
            />
          </div>

          {/* Botón redondo azul #005198 de 48 px */}
          <button
            type="submit"
            disabled={texto.trim().length === 0}
            className="w-12 h-12 rounded-full bg-[#005198] hover:bg-[#003A73] active:bg-[#003A73] text-white flex items-center justify-center flex-shrink-0 shadow-sm transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Enviar mensaje"
          >
            <Send className="w-5 h-5 text-white ml-0.5" strokeWidth={2.2} />
          </button>
        </form>
      </footer>
    </div>
  );
};
