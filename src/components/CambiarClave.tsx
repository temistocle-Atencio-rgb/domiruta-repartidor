import React, { useState } from 'react';
import { cambiarClave } from '../supabase.ts';

/** «Cambiar mi clave» (en Mis salidas): la actual y la nueva dos veces. */
export function CambiarClave() {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [otra, setOtra] = useState('');
  const [msj, setMsj] = useState<{ ok: boolean; t: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const num = (t: string) => t.replace(/\D/g, '').slice(0, 6);
  const campo =
    'w-full min-h-[48px] px-3 border border-[#C9D1DA] rounded-[5px] font-inter text-[16px] text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#005198]';

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="min-h-[48px] px-4 text-[#005198] font-poppins font-medium text-[14px] cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-[#005198] rounded-[5px]"
      >
        Cambiar mi clave
      </button>
    );
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (actual.length !== 6 || nueva.length !== 6) return setMsj({ ok: false, t: 'Las claves son de 6 números.' });
    if (nueva !== otra) return setMsj({ ok: false, t: 'La clave nueva no es igual las dos veces.' });
    setGuardando(true);
    const r = await cambiarClave(actual, nueva);
    setGuardando(false);
    if (r === 'ok') {
      setActual('');
      setNueva('');
      setOtra('');
      setMsj({ ok: true, t: 'Listo, tu clave cambió. La próxima vez entra con la nueva.' });
    } else {
      setMsj({ ok: false, t: r });
    }
  };

  return (
    <form onSubmit={guardar} className="w-full max-w-sm mx-auto bg-white rounded-[5px] border border-[#E3E7EC] p-4 space-y-3 text-left" noValidate>
      <h2 className="font-poppins font-bold text-[16px] text-[#003A73] m-0">Cambiar mi clave</h2>
      {[
        ['Clave actual', actual, setActual, 'clave-actual'],
        ['Clave nueva (6 números)', nueva, setNueva, 'clave-nueva'],
        ['Repite la clave nueva', otra, setOtra, 'clave-otra'],
      ].map(([l, v, f, id]) => (
        <div key={id as string} className="space-y-1">
          <label htmlFor={id as string} className="block font-inter text-[13.5px] font-medium text-[#1F2933]">
            {l as string}
          </label>
          <input
            id={id as string}
            type="password"
            inputMode="numeric"
            autoComplete={id === 'clave-actual' ? 'current-password' : 'new-password'}
            value={v as string}
            onChange={(e) => (f as (x: string) => void)(num(e.target.value))}
            className={campo}
          />
        </div>
      ))}
      {msj && (
        <p role="status" className={`font-inter text-[13.5px] m-0 ${msj.ok ? 'text-[#1E7A44]' : 'text-[#B03030]'}`}>
          {msj.t}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 min-h-[48px] bg-[#005198] hover:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[14px] cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#005198] focus:ring-offset-2"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setMsj(null);
          }}
          className="min-h-[48px] px-4 text-[#005198] font-poppins font-medium text-[14px] cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-[#005198] rounded-[5px]"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}
