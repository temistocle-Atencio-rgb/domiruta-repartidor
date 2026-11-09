import { useEffect, useState } from 'react';
import { alCambiar, donde, esApp, instalar, sePuedeInstalar } from '../utils/instalar.ts';

interface Props {
  nombre: string; // «la app de repartidor», «la tienda», «Pedidos en línea»
  oscuro?: boolean; // encima de la franja azul
}

/**
 * «Instalar app»: si Chrome lo permite abre su ventana; si no, explica cómo hacerlo
 * (iPhone: Compartir › Agregar a inicio; dentro de WhatsApp: abrir en Chrome primero).
 * No sale si ya está abierta como app.
 */
export function BotonInstalar({ nombre, oscuro }: Props) {
  const [puede, setPuede] = useState(sePuedeInstalar());
  const [ayuda, setAyuda] = useState(false);
  const [instalada, setInstalada] = useState(false);
  useEffect(() => alCambiar(() => setPuede(sePuedeInstalar())), []);
  if (esApp() || instalada) return null;
  const d = donde();
  const pulsar = async () => {
    if (puede) {
      if (await instalar()) setInstalada(true);
    } else {
      setAyuda((x) => !x);
    }
  };
  const texto =
    d === 'dentro-de-otra-app'
      ? 'Estás dentro de WhatsApp (u otra app) y desde aquí no se puede instalar. Toca los tres puntos ⋮ arriba y elige «Abrir en Chrome» (en iPhone: «Abrir en Safari»). Allá toca otra vez «Instalar app».'
      : d === 'iphone'
        ? 'En Safari toca el botón Compartir (el cuadrito con la flecha) y luego «Agregar a inicio».'
        : d === 'android'
          ? 'Toca los tres puntos ⋮ de Chrome y elige «Instalar app» o «Agregar a la pantalla principal». Si ya la tenías instalada y la borraste, espera un minuto y recarga la página.'
          : 'En Chrome o Edge toca el ícono de instalar en la barra de la dirección (o el menú ⋮ › «Instalar»).';
  return (
    <div className={oscuro ? '' : 'w-full'}>
      <button
        type="button"
        onClick={pulsar}
        aria-expanded={puede ? undefined : ayuda}
        className={
          oscuro
            ? 'h-[36px] px-2.5 rounded-[5px] border border-white/40 hover:bg-white/10 text-white font-poppins text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-white'
            : 'w-full min-h-[44px] px-3 rounded-[5px] border border-[#005198] text-[#005198] bg-white hover:bg-[#EEF4FA] font-poppins font-medium text-[14px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#005198] focus:ring-offset-2'
        }
      >
        Instalar {nombre} en este celular
      </button>
      {ayuda && !puede && (
        <p
          role="status"
          className={`mt-2 font-inter text-[13px] leading-snug ${oscuro ? 'text-white' : 'text-[#1F2933] bg-[#EEF4FA] border border-[#C9D9EA] rounded-[5px] p-2.5'}`}
        >
          {texto}
        </p>
      )}
    </div>
  );
}
