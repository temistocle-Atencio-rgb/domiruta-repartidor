import React from 'react';
import { X } from 'lucide-react';

interface VisorFotoProps {
  fotoUrl: string | null;
  nombreParada?: string;
  onCerrar: () => void;
}

export const VisorFoto: React.FC<VisorFotoProps> = ({ fotoUrl, nombreParada, onCerrar }) => {
  if (!fotoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onCerrar}
    >
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={onCerrar}
          className="w-11 h-11 rounded-[5px] bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Cerrar visor de foto"
        >
          <X className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {nombreParada && (
        <div className="absolute top-5 left-4 z-10 text-white font-poppins text-sm font-semibold truncate max-w-[70vw]">
          Foto de {nombreParada}
        </div>
      )}

      <div
        className="max-w-full max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={fotoUrl}
          alt={nombreParada ? `Foto de entrega ${nombreParada}` : 'Foto de entrega'}
          className="max-w-full max-h-[85vh] object-contain rounded-[5px] shadow-2xl"
        />
      </div>
    </div>
  );
};
