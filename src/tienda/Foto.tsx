import { useState } from 'react';
import { Package } from '../iconos/Icono';

export function Foto({ src, alt, gris = false, className = '' }: { src: string | null; alt: string; gris?: boolean; className?: string }) {
  const [mala, setMala] = useState(false);
  return (
    <div className={`bg-white flex items-center justify-center overflow-hidden ${gris ? 'grayscale opacity-60' : ''} ${className}`}>
      {src && !mala
        ? <img src={src} alt={alt} loading="lazy" onError={() => setMala(true)} className="w-full h-full object-contain" />
        : <Package className="text-[#9AA5B1] w-1/3 h-1/3" aria-hidden="true" />}
    </div>
  );
}
