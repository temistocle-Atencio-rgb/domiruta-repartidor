import React, { useState } from 'react';
import { entrar } from '../supabase.ts';

interface Props {
  dispositivo: string;
  aviso?: string | null; // por qué se le pide entrar otra vez
  onEntro: () => void;
}

/** El repartidor entra con su celular y su clave de 6 números (se la da la tienda). */
export function PantallaEntrar({ dispositivo, aviso, onEntro }: Props) {
  const [celular, setCelular] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const soloNumeros = (t: string, max: number) => t.replace(/\D/g, '').slice(0, max);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entrando) return;
    if (celular.length !== 10 || clave.length !== 6) {
      setError('Escribe tu celular (10 números) y tu clave (6 números).');
      return;
    }
    setEntrando(true);
    setError(null);
    const r = await entrar(celular, clave, dispositivo);
    setEntrando(false);
    if (r.ok) {
      onEntro();
      return;
    }
    setClave('');
    setError(
      r.error === 'bloqueado'
        ? `Por seguridad, espera ${r.minutos ?? 15} minutos o pídele a la tienda una clave nueva.`
        : r.error === 'clave'
          ? `Celular o clave incorrectos.${typeof r.quedan === 'number' ? ` Te quedan ${r.quedan} ${r.quedan === 1 ? 'intento' : 'intentos'}.` : ''}`
          : r.error === 'datos'
            ? 'Escribe tu celular (10 números) y tu clave (6 números).'
            : 'No se pudo entrar. Revisa el internet.'
    );
  };

  const campo =
    'w-full min-h-[48px] px-3 border border-[#C9D1DA] rounded-[5px] font-inter text-[17px] text-[#1F2933] bg-white focus:outline-none focus:ring-2 focus:ring-[#005198] tracking-wide';

  return (
    <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 space-y-4"
        noValidate
      >
        <div className="flex items-center gap-3">
          <svg className="w-9 h-10 flex-shrink-0" viewBox="0 0 259.8 300" fill="none" aria-hidden="true">
            <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
            <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
            <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
          </svg>
          <h1 className="font-poppins font-bold text-[20px] text-[#003A73] leading-tight m-0">DomiRuta Repartidor</h1>
        </div>
        {aviso && <p className="font-inter text-[14px] text-[#8A4B00] m-0 leading-snug">{aviso}</p>}
        <div className="space-y-1.5">
          <label htmlFor="celular" className="block font-inter text-[14px] font-medium text-[#1F2933]">
            Tu celular
          </label>
          <input
            id="celular"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="3001112233"
            value={celular}
            onChange={(e) => setCelular(soloNumeros(e.target.value, 10))}
            className={campo}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="clave" className="block font-inter text-[14px] font-medium text-[#1F2933]">
            Tu clave (6 números)
          </label>
          <input
            id="clave"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="••••••"
            value={clave}
            onChange={(e) => setClave(soloNumeros(e.target.value, 6))}
            className={campo}
          />
        </div>
        {error && (
          <p role="alert" className="font-inter text-[14px] text-[#B03030] m-0 leading-snug">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={entrando}
          className="w-full min-h-[48px] bg-[#F28C1B] hover:bg-[#e07f15] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[16px] cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#005198] focus:ring-offset-2"
        >
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="font-inter text-[13px] text-[#5B6670] m-0 leading-snug">
          ¿No tienes clave o se te olvidó? Pídesela a la tienda.
        </p>
      </form>
    </main>
  );
}
