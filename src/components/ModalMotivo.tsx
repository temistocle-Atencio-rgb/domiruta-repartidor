import React, { useState } from 'react';
import { Parada } from '../types.ts';
import { X, Check } from 'lucide-react';

interface ModalMotivoProps {
  parada: Parada;
  abierto: boolean;
  guardando: boolean;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}

const OPCIONES_MOTIVOS = [
  'No abrieron',
  'No contestó',
  'Dirección equivocada',
  'No quiso recibir',
  'Otro',
] as const;

export const ModalMotivo: React.FC<ModalMotivoProps> = ({
  parada,
  abierto,
  guardando,
  onCerrar,
  onConfirmar,
}) => {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>('No abrieron');
  const [textoOtro, setTextoOtro] = useState<string>('');

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (motivoSeleccionado === 'Otro') {
      const limpio = textoOtro.trim();
      onConfirmar(limpio.length > 0 ? limpio : 'Otro');
    } else {
      onConfirmar(motivoSeleccionado);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[1px] p-0 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-motivo-title"
    >
      <div
        className="bg-white w-full max-w-md rounded-t-[10px] sm:rounded-[5px] shadow-[0_4px_20px_rgba(0,0,0,0.18)] border border-[#E3E7EC] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E3E7EC] bg-[#F2F4F7]">
          <div>
            <span className="font-inter text-xs text-[#5B6670] uppercase tracking-wider block">
              Parada #{parada.orden}
            </span>
            <h2 id="modal-motivo-title" className="font-poppins font-bold text-[18px] text-[#003A73] m-0 leading-tight">
              ¿Por qué no se pudo entregar?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="w-10 h-10 flex items-center justify-center rounded-[5px] text-[#5B6670] hover:text-[#1F2933] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3">
          <p className="font-inter text-[14px] text-[#5B6670] m-0">
            Cliente: <strong className="text-[#1F2933]">{parada.nombre}</strong>
          </p>

          {/* Lista de motivos seleccionables con altura táctil >= 48px */}
          <div className="space-y-2 pt-1">
            {OPCIONES_MOTIVOS.map((opcion) => {
              const estaSeleccionado = motivoSeleccionado === opcion;
              return (
                <label
                  key={opcion}
                  className={`min-h-[48px] px-3.5 py-2.5 flex items-center justify-between rounded-[5px] border cursor-pointer transition-colors ${
                    estaSeleccionado
                      ? 'border-[#005198] bg-[#005198]/5 text-[#003A73]'
                      : 'border-[#E3E7EC] hover:bg-[#F2F4F7] text-[#1F2933]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="motivo"
                      value={opcion}
                      checked={estaSeleccionado}
                      onChange={() => setMotivoSeleccionado(opcion)}
                      className="w-4 h-4 text-[#005198] accent-[#005198] cursor-pointer"
                    />
                    <span className="font-inter text-[14px] font-medium">
                      {opcion}
                    </span>
                  </div>
                  {estaSeleccionado && (
                    <Check className="w-4 h-4 text-[#005198] flex-shrink-0" strokeWidth={2.5} />
                  )}
                </label>
              );
            })}
          </div>

          {/* Campo de texto si seleccionó "Otro" */}
          {motivoSeleccionado === 'Otro' && (
            <div className="pt-2 animate-in fade-in duration-100">
              <label htmlFor="input-otro" className="block font-inter text-xs text-[#5B6670] uppercase tracking-wide mb-1.5 font-medium">
                Escribe el motivo corto
              </label>
              <input
                id="input-otro"
                type="text"
                maxLength={80}
                value={textoOtro}
                onChange={(e) => setTextoOtro(e.target.value)}
                placeholder="Ej. Casa sola, perro suelto, etc."
                autoFocus
                className="w-full h-[40px] px-3 bg-white border border-[#C9CFD6] rounded-[5px] font-inter text-[14px] text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#005198] focus:border-transparent"
              />
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-3 flex flex-col sm:flex-row gap-2 border-t border-[#E3E7EC]">
            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:flex-1 h-[48px] bg-[#005198] hover:bg-[#003A73] active:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[14px] flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              {guardando ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                'Confirmar motivo'
              )}
            </button>
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="w-full sm:w-auto px-5 h-[48px] bg-transparent hover:bg-black/5 text-[#005198] rounded-[5px] font-poppins font-medium text-[14px] flex items-center justify-center transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
