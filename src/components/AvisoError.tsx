import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AvisoErrorProps {
  mensaje: string | null;
  onCerrar: () => void;
}

export const AvisoError: React.FC<AvisoErrorProps> = ({ mensaje, onCerrar }) => {
  useEffect(() => {
    if (!mensaje) return;
    const timer = setTimeout(() => {
      onCerrar();
    }, 6000);
    return () => clearTimeout(timer);
  }, [mensaje, onCerrar]);

  if (!mensaje) return null;

  return (
    <div
      role="alert"
      className="fixed top-20 left-4 right-4 z-40 max-w-md mx-auto bg-white border-l-4 border-[#B03030] rounded-[5px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-3.5 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertCircle className="w-5 h-5 text-[#B03030] flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p className="font-inter text-[14px] font-medium text-[#B03030] leading-snug m-0">
          {mensaje}
        </p>
      </div>
      <button
        type="button"
        onClick={onCerrar}
        className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center rounded-[5px] text-[#5B6670] hover:text-[#1F2933] hover:bg-black/5 transition-colors cursor-pointer"
        aria-label="Cerrar aviso"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
};
