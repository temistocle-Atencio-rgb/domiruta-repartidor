import React, { useState } from 'react';

/** Saca s, r o p de un enlace pegado (o de un texto de WhatsApp que lo trae). */
export function leerEnlacePegado(texto: string): { clave: 's' | 'r' | 'p'; valor: string } | null {
  const m = texto.match(/[?&](s|r|p)=([A-Za-z0-9_-]{6,})/);
  return m ? { clave: m[1] as 's' | 'r' | 'p', valor: m[2] } : null;
}

/**
 * Cuando la app instalada abre sin nada guardado (en iPhone la app instalada no ve lo del navegador):
 * el repartidor pega aquí el enlace que le llegó por WhatsApp y queda guardado en la app.
 */
export function PegarEnlace() {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(false);

  const abrir = () => {
    const e = leerEnlacePegado(texto);
    if (!e) {
      setError(true);
      return;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set(e.clave, e.valor);
    window.location.assign(url.toString());
  };

  return (
    <div className="space-y-2 text-left">
      <label htmlFor="pegar-enlace" className="block font-inter text-[13.5px] text-[#1F2933] font-medium">
        ¿Ya tienes el enlace? Pégalo aquí:
      </label>
      <input
        id="pegar-enlace"
        type="url"
        inputMode="url"
        autoComplete="off"
        value={texto}
        onChange={(ev) => {
          setTexto(ev.target.value);
          setError(false);
        }}
        placeholder="https://…"
        className="w-full min-h-[48px] px-3 border border-[#C9D1DA] rounded-[5px] font-inter text-[15px] text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#005198]"
      />
      {error && (
        <p className="font-inter text-[13px] text-[#B03030] m-0">Ese no es un enlace de DomiRuta. Cópialo completo del WhatsApp.</p>
      )}
      <button
        type="button"
        onClick={abrir}
        className="w-full min-h-[48px] bg-[#005198] hover:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[15px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#005198] focus:ring-offset-2"
      >
        Abrir
      </button>
    </div>
  );
}
