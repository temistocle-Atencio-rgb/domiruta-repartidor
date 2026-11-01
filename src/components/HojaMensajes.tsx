import React, { useState, useEffect, useRef } from 'react';
import { Mensaje } from '../types.ts';
import { X, Send } from 'lucide-react';

interface HojaMensajesProps {
  abierta: boolean;
  mensajes: Mensaje[];
  onCerrar: () => void;
  onEnviarMensaje: (texto: string) => Promise<boolean>;
}

const BOTONES_RAPIDOS = [
  'No encuentro la dirección',
  'El cliente no contesta',
  'Necesito cambio',
  'Ya voy de regreso',
] as const;

export const HojaMensajes: React.FC<HojaMensajesProps> = ({
  abierta,
  mensajes,
  onCerrar,
  onEnviarMensaje,
}) => {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final al abrir o recibir mensajes
  useEffect(() => {
    if (abierta) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [abierta, mensajes]);

  if (!abierta) return null;

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

  const handleEnviar = async (textoAEnviar: string) => {
    const limpio = textoAEnviar.trim();
    if (!limpio || enviando) return;

    setEnviando(true);
    setErrorEnvio(null);

    const exito = await onEnviarMensaje(limpio);
    if (exito) {
      setTexto('');
    } else {
      setErrorEnvio('No se pudo enviar. Revisa el internet');
    }
    setEnviando(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[1px] animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hoja-mensajes-titulo"
    >
      <div
        className="bg-white w-full max-w-md h-[88vh] max-h-[720px] rounded-t-[10px] shadow-[0_-4px_20px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden border-t border-[#E3E7EC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de la hoja */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3E7EC] bg-[#003A73] text-white">
          <div>
            <h2 id="hoja-mensajes-titulo" className="font-poppins font-bold text-[17px] text-white m-0 leading-tight">
              Mensajes con la tienda
            </h2>
            <span className="font-inter text-xs text-white/80">
              Comunicación directa con la tienda
            </span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="w-10 h-10 flex items-center justify-center rounded-[5px] text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar mensajes"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Alerta de error si falla el envío */}
        {errorEnvio && (
          <div className="bg-[#B03030]/10 border-b border-[#B03030]/20 px-4 py-2 font-inter text-xs font-medium text-[#B03030]">
            {errorEnvio}
          </div>
        )}

        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F2F4F7]">
          {mensajes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-6">
              <p className="font-inter text-[14px] text-[#5B6670] m-0">
                Aún no hay mensajes en esta salida. Toca un botón rápido o escribe abajo para comunicarte con la tienda.
              </p>
            </div>
          ) : (
            mensajes.map((m) => {
              const esTienda = m.de === 'tienda';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${esTienda ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-[5px] shadow-xs text-[14px] font-inter leading-snug break-words ${
                      esTienda
                        ? 'bg-white text-[#1F2933] border border-[#E3E7EC]'
                        : 'bg-[#E8F0F8] text-[#1F2933] border border-[#005198]/15'
                    }`}
                  >
                    <span className="block text-[11px] font-poppins font-semibold uppercase tracking-wider text-[#5B6670] mb-0.5">
                      {esTienda ? 'Tienda' : 'Tú'}
                    </span>
                    <p className="m-0 font-normal whitespace-pre-wrap">{m.texto}</p>
                  </div>
                  <span className="font-inter text-[11px] text-[#5B6670] mt-1 px-1">
                    {formatearHora(m.creado)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Zona inferior: Botones rápidos + Campo de texto */}
        <div className="p-3 bg-white border-t border-[#E3E7EC] space-y-2.5">
          {/* Botones rápidos grandes y fáciles de tocar con una mano */}
          <div className="grid grid-cols-2 gap-2">
            {BOTONES_RAPIDOS.map((frase) => (
              <button
                key={frase}
                type="button"
                onClick={() => handleEnviar(frase)}
                disabled={enviando}
                className="min-h-[44px] px-2.5 py-1.5 bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#005198] border border-[#E3E7EC] rounded-[5px] font-poppins font-semibold text-[12px] text-left leading-tight flex items-center transition-colors disabled:opacity-50 cursor-pointer"
              >
                {frase}
              </button>
            ))}
          </div>

          {/* Formulario de texto manual */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnviar(texto);
            }}
            className="flex items-center gap-2 pt-1"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={texto}
                maxLength={300}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe un mensaje..."
                disabled={enviando}
                className="w-full h-[48px] px-3.5 bg-white border border-[#C9CFD6] rounded-[5px] font-inter text-[14px] text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#005198] focus:border-transparent placeholder:text-[#5B6670]/70"
              />
              {texto.length > 250 && (
                <span className="absolute right-2.5 bottom-1 text-[10px] text-[#5B6670] font-inter">
                  {texto.length}/300
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={enviando || texto.trim().length === 0}
              className="h-[48px] px-4 bg-[#005198] hover:bg-[#003A73] active:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[14px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
              aria-label="Enviar mensaje"
            >
              {enviando ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={2} />
                  <span className="hidden xs:inline">Enviar</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
