import React from 'react';
import { formatearPesos } from '../supabase.ts';

interface ResumenFijoProps {
  totalPlataATraer: number;
}

export const ResumenFijo: React.FC<ResumenFijoProps> = ({ totalPlataATraer }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E3E7EC] shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
        <span className="font-inter text-[15px] font-medium text-[#1F2933]">
          Plata a traer:
        </span>
        <span className="font-poppins font-bold text-[21px] text-[#003A73] leading-none">
          {formatearPesos(totalPlataATraer)}
        </span>
      </div>
    </div>
  );
};
