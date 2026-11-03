import { Minus, Plus, Trash2 } from 'lucide-react';

/** «– n +». Con 1, el «–» es una caneca para quitarlo. */
export function Cantidad({ n, nombre, cambiar, grande = false }: {
  n: number; nombre: string; cambiar: (n: number) => void; grande?: boolean;
}) {
  const alto = grande ? 'h-12' : 'h-11';
  return (
    <div className={`flex items-center justify-between ${alto} rounded-[5px] border border-[#005198] bg-white`}>
      <button type="button" onClick={() => cambiar(n - 1)}
        aria-label={n === 1 ? `Quitar ${nombre}` : `Uno menos de ${nombre}`}
        className={`${alto} w-11 flex items-center justify-center text-[#005198] rounded-[5px]`}>
        {n === 1 ? <Trash2 size={18} /> : <Minus size={18} />}
      </button>
      <span className="font-poppins font-semibold text-[15px] min-w-6 text-center" aria-live="polite">{n}</span>
      <button type="button" onClick={() => cambiar(n + 1)} disabled={n >= 99}
        aria-label={`Uno más de ${nombre}`}
        className={`${alto} w-11 flex items-center justify-center text-[#005198] rounded-[5px] disabled:opacity-40`}>
        <Plus size={18} />
      </button>
    </div>
  );
}
