import React, { useState } from 'react';
import { verPedidoCodigo } from '../supabase.ts';
import { PedidoCliente } from '../types.ts';

interface PantallaConsultarPedidoProps {
  onPedidoEncontrado: (pedido: PedidoCliente, consulta: { codigo: string; ultimos4: string }) => void;
}

export const PantallaConsultarPedido: React.FC<PantallaConsultarPedidoProps> = ({
  onPedidoEncontrado,
}) => {
  const [codigo, setCodigo] = useState<string>('');
  const [ultimos4, setUltimos4] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorTexto, setErrorTexto] = useState<string | null>(null);

  // Manejar cambio en código de pedido: quitar espacios y pasar a mayúsculas
  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const limpio = raw.replace(/\s+/g, '').toUpperCase();
    if (limpio.length <= 12) {
      setCodigo(limpio);
      if (errorTexto) setErrorTexto(null);
    }
  };

  // Manejar cambio en celular: solo números, máximo 4 dígitos
  const handleUltimos4Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const soloNumeros = raw.replace(/\D/g, '').slice(0, 4);
    setUltimos4(soloNumeros);
    if (errorTexto) setErrorTexto(null);
  };

  const puedeConsultar = codigo.trim().length >= 6 && ultimos4.length === 4 && !cargando;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpio = codigo.trim();
    if (codigoLimpio.length < 6 || ultimos4.length !== 4) return;

    setCargando(true);
    setErrorTexto(null);

    try {
      const res = await verPedidoCodigo(codigoLimpio, ultimos4);

      if (res.tipo === 'espera') {
        setErrorTexto('Hiciste muchos intentos. Espera unos minutos y vuelve a intentar');
      } else if (res.tipo === 'exito') {
        onPedidoEncontrado(res.data, { codigo: codigoLimpio, ultimos4 });
      } else {
        setErrorTexto('No encontramos un pedido con esos datos. Revisa el código y el número');
      }
    } catch {
      setErrorTexto('No se pudo consultar el pedido. Revisa tu conexión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 space-y-5">
        {/* Cubo de DomiRuta */}
        <div className="flex justify-center">
          <svg
            className="w-12 h-14"
            viewBox="0 0 259.8 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
            <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
            <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
          </svg>
        </div>

        {/* Título */}
        <div className="text-center">
          <h1 className="font-poppins font-bold text-[20px] text-[#003A73] m-0 leading-tight">
            Sigue tu pedido
          </h1>
          <p className="font-inter text-[13.5px] text-[#5B6670] mt-1 mb-0">
            Ingresa los datos para ver por dónde va tu entrega en tiempo real.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="codigo-pedido"
              className="block font-poppins font-medium text-[13px] text-[#003A73] mb-1"
            >
              Código del pedido
            </label>
            <input
              id="codigo-pedido"
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              value={codigo}
              onChange={handleCodigoChange}
              placeholder="Ej. ABC123"
              disabled={cargando}
              className="w-full h-[46px] px-3.5 bg-white border border-[#E3E7EC] rounded-[5px] font-inter text-[15px] font-medium text-[#1F2933] placeholder:text-[#5B6670]/60 tracking-wider uppercase transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="celular-ultimos4"
              className="block font-poppins font-medium text-[13px] text-[#003A73] mb-1"
            >
              Últimos 4 números de tu celular
            </label>
            <input
              id="celular-ultimos4"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={ultimos4}
              onChange={handleUltimos4Change}
              placeholder="1234"
              disabled={cargando}
              className="w-full h-[46px] px-3.5 bg-white border border-[#E3E7EC] rounded-[5px] font-inter text-[15px] font-medium text-[#1F2933] placeholder:text-[#5B6670]/60 tracking-widest transition-colors"
            />
          </div>

          {/* Mensajes de error en texto con color sin fondo ni píldora */}
          {errorTexto && (
            <p
              role="alert"
              className="font-inter text-[13.5px] text-[#B03030] leading-snug m-0 text-left"
            >
              {errorTexto}
            </p>
          )}

          {/* Botón único naranja por pantalla con texto gris oscuro */}
          <button
            type="submit"
            disabled={!puedeConsultar}
            className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07f14] active:bg-[#d2750f] text-[#1F2933] rounded-[5px] font-poppins font-bold text-[15px] tracking-wide transition-colors flex items-center justify-center cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.08)] mt-2"
          >
            {cargando ? 'Consultando…' : 'Ver mi pedido'}
          </button>
        </form>
      </div>
    </main>
  );
};
