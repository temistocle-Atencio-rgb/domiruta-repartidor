import React from 'react';
import { formatearPesos } from '../supabase.ts';

interface ResumenFijoProps {
  /** Lo que ha cobrado en las puertas (solo lo entregado). */
  cobrado: number;
  /** Lo que es de él: sus domicilios o su tarifa por entrega (solo lo entregado). */
  ganancia: number;
}

/**
 * Abajo, siempre a la vista: cuánta plata es de la tienda y cuánta es de él.
 * Si no gana por entrega (tiene sueldo), muestra solo la plata a traer.
 */
export const ResumenFijo: React.FC<ResumenFijoProps> = ({ cobrado, ganancia }) => {
  const aLaTienda = cobrado - ganancia;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E3E7EC] shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="max-w-md mx-auto px-4 py-3">
        {ganancia > 0 && (
          <div className="flex items-center justify-between font-inter text-[13px] text-[#5B6670] mb-1.5">
            <span>Cobrado: {formatearPesos(cobrado)}</span>
            <span>
              Tu ganancia: <strong className="text-[#1E7A44]">{formatearPesos(ganancia)}</strong>
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-inter text-[15px] font-medium text-[#1F2933]">
            {ganancia > 0 ? (aLaTienda >= 0 ? 'A la tienda le entregas:' : 'La tienda te paga:') : 'Plata a traer:'}
          </span>
          <span className="font-poppins font-bold text-[21px] text-[#003A73] leading-none">
            {formatearPesos(Math.abs(aLaTienda))}
          </span>
        </div>
      </div>
    </div>
  );
};
