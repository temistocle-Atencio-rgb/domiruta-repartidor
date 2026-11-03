import React, { useState } from 'react';
import { Parada } from '../types.ts';
import { ChevronDown, ChevronUp, RotateCcw, Check, XCircle } from 'lucide-react';
import { Camera } from '../iconos/Icono';
import { subirFoto } from '../supabase.ts';
import { comprimirFoto } from '../utils/image.ts';

interface SeccionHechasProps {
  paradasHechas: Parada[];
  cargandoParadaId: string | number | null;
  fotosEnMemoria: Record<string | number, string>;
  onDeshacer: (parada: Parada) => void;
  onVerFotoGrande: (url: string, nombre: string) => void;
  codigo: string;
  onFotoSubidaExito: (paradaId: string | number, dataUrl: string) => void;
  onMostrarError: (msg: string) => void;
}

export const SeccionHechas: React.FC<SeccionHechasProps> = ({
  paradasHechas,
  cargandoParadaId,
  fotosEnMemoria,
  onDeshacer,
  onVerFotoGrande,
  codigo,
  onFotoSubidaExito,
  onMostrarError,
}) => {
  const [abierta, setAbierta] = useState(false);
  const [subiendo, setSubiendo] = useState<string | number | null>(null);

  if (paradasHechas.length === 0) return null;

  return (
    <section aria-label="Entregas realizadas" className="pt-2">
      {/* Cabecera desplegable de la sección */}
      <button
        type="button"
        onClick={() => setAbierta((prev) => !prev)}
        className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border border-[#E3E7EC] rounded-[5px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-between transition-colors hover:bg-[#F2F4F7] cursor-pointer"
        aria-expanded={abierta}
      >
        <div className="flex items-center gap-2">
          <span className="font-poppins font-bold text-[16px] text-[#003A73]">
            Hechas ({paradasHechas.length})
          </span>
          <span className="font-inter text-xs text-[#5B6670]">
            {paradasHechas.some((p) => p.pendiente_envio)
              ? `${paradasHechas.filter((p) => p.pendiente_envio).length} por enviar (sin señal)`
              : abierta ? 'Toca para ocultar' : 'Toca para ver'}
          </span>
        </div>
        {abierta ? (
          <ChevronUp className="w-5 h-5 text-[#003A73]" strokeWidth={2} />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#003A73]" strokeWidth={2} />
        )}
      </button>

      {/* Lista de filas compactas */}
      {abierta && (
        <div className="mt-2 space-y-2 animate-in fade-in duration-200">
          {paradasHechas.map((parada) => {
            const esEntregado = parada.estado === 'entregado';
            const foto = fotosEnMemoria[parada.id];
            const cargandoEsta = cargandoParadaId === parada.id;

            return (
              <div
                key={parada.id}
                className="bg-white rounded-[5px] border border-[#E3E7EC] p-3 shadow-xs flex items-center justify-between gap-3 transition-all duration-200"
              >
                {/* Izquierda: Número, Nombre y Estado como texto de color */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-7 h-7 flex-shrink-0 rounded-[5px] bg-[#003A73]/10 text-[#003A73] font-poppins font-bold text-xs flex items-center justify-center">
                    {parada.orden}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-poppins font-semibold text-[14px] text-[#1F2933] leading-snug break-words m-0">
                      {parada.nombre}
                    </p>
                    <p className="font-inter text-[12.5px] text-[#5B6670] leading-tight break-words mt-0.5 mb-1">
                      {parada.direccion}
                    </p>
                    {esEntregado ? (
                      <span className="font-poppins font-semibold text-[13px] text-[#1E7A44] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-[#1E7A44]" strokeWidth={2.5} />
                        Entregado
                      </span>
                    ) : (
                      <span className="font-poppins font-semibold text-[12.5px] text-[#B03030] flex items-center gap-1 break-words">
                        <XCircle className="w-3.5 h-3.5 text-[#B03030] flex-shrink-0" strokeWidth={2} />
                        No entregado{parada.motivo ? ` · ${parada.motivo}` : ''}
                      </span>
                    )}
                    {parada.pendiente_envio && (
                      <p className="font-inter text-[12.5px] text-[#5B6670] mt-1 mb-0">Se enviará al volver la señal</p>
                    )}
                  </div>
                </div>

                {/* Derecha: Miniatura de foto (si hay) y enlace Deshacer */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {parada.estado === 'entregado' && !parada.tiene_foto && !parada.pendiente_envio && (
                    // la foto de la entrega (prueba de que llegó): se toma después de marcar «Entregué»
                    <label
                      className={`min-h-[44px] px-2.5 flex items-center gap-1.5 text-[#005198] font-inter text-[13.5px] font-medium rounded-[5px] cursor-pointer hover:underline focus-within:ring-2 focus-within:ring-[#005198] ${subiendo === parada.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <Camera className="w-4 h-4" strokeWidth={2} />
                      <span>{subiendo === parada.id ? 'Enviando…' : 'Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        aria-label={`Tomar foto de la entrega de ${parada.nombre}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          setSubiendo(parada.id);
                          try {
                            const dataUrl = await comprimirFoto(file);
                            if (await subirFoto(codigo, parada.id, dataUrl)) {
                              onFotoSubidaExito(parada.id, dataUrl);
                            } else {
                              onMostrarError('No se pudo subir la foto. Revisa el internet');
                            }
                          } catch (err: unknown) {
                            onMostrarError(
                              err instanceof Error && err.message === 'La foto es muy pesada. Toma otra'
                                ? err.message
                                : 'No se pudo subir la foto. Revisa el internet'
                            );
                          } finally {
                            setSubiendo(null);
                          }
                        }}
                      />
                    </label>
                  )}
                  {parada.tiene_foto && (
                    foto ? (
                      <button
                        type="button"
                        onClick={() => onVerFotoGrande(foto, parada.nombre)}
                        className="w-10 h-10 rounded-[5px] overflow-hidden border border-[#E3E7EC] flex-shrink-0 cursor-pointer hover:opacity-85"
                        title="Ver foto de entrega"
                      >
                        <img
                          src={foto}
                          alt={`Foto de ${parada.nombre}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-[5px] bg-[#F2F4F7] border border-[#E3E7EC] flex items-center justify-center text-[#5B6670]"
                        title="Foto enviada"
                      >
                        <Camera className="w-4 h-4 text-[#5B6670]" strokeWidth={2} />
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => onDeshacer(parada)}
                    disabled={cargandoEsta}
                    className="min-h-[40px] px-2 text-[#005198] hover:text-[#003A73] hover:underline font-inter text-[13px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>{cargandoEsta ? '...' : 'Deshacer'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
