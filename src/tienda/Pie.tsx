import { MapPin, Phone, Clock } from 'lucide-react';
import { Tienda } from './tipos.ts';
import { MEDIOS, mediosDe } from './pagos.ts';

/** Abajo de la tienda: cómo encontrarla, cómo escribirle y con qué se puede pagar. */
export function Pie({ tienda }: { tienda: Tienda }) {
  const cel = tienda.telefono.replace(/\D/g, '');
  const wa = /^3\d{9}$/.test(cel) ? `https://wa.me/57${cel}` : '';
  return (
    <footer className="mt-8 bg-white border-t border-[#E3E7EC]">
      <div className="max-w-5xl mx-auto px-4 py-6 grid gap-6 min-[700px]:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            {tienda.logo && <img src={tienda.logo} alt="" className="w-12 h-12 object-contain" />}
            <h2 className="font-poppins font-semibold text-[17px] text-[#003A73]">{tienda.nombre || 'Tienda en línea'}</h2>
          </div>
          <ul className="mt-3 space-y-2 text-[14px] text-[#1F2933]">
            {tienda.direccion && <li className="flex gap-2"><MapPin size={18} className="text-[#005198] shrink-0" />{tienda.direccion}</li>}
            {tienda.horario && <li className="flex gap-2"><Clock size={18} className="text-[#005198] shrink-0" />{tienda.horario}</li>}
            {tienda.telefono && (
              <li className="flex gap-2 items-center"><Phone size={18} className="text-[#005198] shrink-0" />
                <a href={`tel:${cel}`} className="underline underline-offset-2">{tienda.telefono}</a>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-1 text-[#005198] font-medium underline underline-offset-2">
                  <img src="./iconos/whatsapp.svg" alt="" className="w-4 h-4" />WhatsApp</a>}
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="font-poppins font-semibold text-[15px]">Medios de pago</h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Medios de pago que acepta la tienda">
            {mediosDe(tienda.pagos).map((m) => (
              <li key={m} className="h-11 px-2 border border-[#E3E7EC] rounded-[5px] flex items-center" title={MEDIOS[m].texto}>
                <img src={`./pagos/${m}.png`} alt={MEDIOS[m].texto} className="h-7 max-w-[84px] object-contain" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-[#5B6670]">El domiciliario lleva el cambio si pagas en efectivo.</p>
        </div>
      </div>
      <p className="border-t border-[#E3E7EC] text-center text-[12px] text-[#5B6670] py-3 px-4">
        {new Date().getFullYear()} © {tienda.nombre || 'Tienda'} · Tienda en línea con DomiRuta
      </p>
    </footer>
  );
}
