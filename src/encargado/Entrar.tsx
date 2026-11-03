import { useState } from 'react';
import { entrar } from './datos.ts';

export function Entrar({ listo, aviso }: { listo: () => void; aviso: string }) {
  const [cel, setCel] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState(aviso);
  const [enviando, setEnviando] = useState(false);
  const campo = 'w-full h-12 rounded-[5px] border border-[#C7CED6] bg-white px-3 text-[16px] outline-none focus:border-[#005198] focus:outline focus:outline-2 focus:outline-[#005198]';
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const r = await entrar(cel, clave);
      if (r) setError(r); else listo();
    } catch (x) {
      setError((x as Error).message);
    }
    setEnviando(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={enviar} className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] p-6">
        <img src="./iconos/pedidos.png" alt="" width={72} height={72} aria-hidden="true" />
        <h1 className="font-poppins font-semibold text-[22px] text-[#003A73] mt-3">Pedidos en línea</h1>
        <p className="text-[14px] text-[#5B6670] mt-1">Entra con tu celular y la clave de 6 números que te dio la tienda.</p>
        <label className="block text-[14px] font-medium mt-5 mb-1" htmlFor="e-cel">Celular</label>
        <input id="e-cel" className={campo} value={cel} onChange={(e) => setCel(e.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="300 123 4567" />
        <label className="block text-[14px] font-medium mt-4 mb-1" htmlFor="e-clave">Clave</label>
        <input id="e-clave" className={campo + ' tracking-[0.3em]'} value={clave} onChange={(e) => setClave(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric" type="password" autoComplete="current-password" placeholder="••••••" />
        {error && <p role="alert" className="mt-4 text-[14px] text-[#B03030] font-medium">{error}</p>}
        <button type="submit" disabled={enviando || cel.length < 10 || clave.length !== 6}
          className="mt-5 w-full h-12 rounded-[5px] bg-[#F28C1B] text-[#1F2933] font-poppins font-semibold disabled:bg-[#E3E7EC] disabled:text-[#5B6670]">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
