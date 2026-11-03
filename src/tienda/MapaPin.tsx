import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';

const RIOHACHA: [number, number] = [11.5444, -72.9072];

/** Mapa pequeño con un pin que se arrastra para marcar la casa */
export function MapaPin({ lat, lon, cambiar }: { lat: number | null; lon: number | null; cambiar: (lat: number, lon: number) => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const alCambiar = useRef(cambiar);
  alCambiar.current = cambiar;
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!caja.current || mapa.current) return;
    const inicio: [number, number] = lat != null && lon != null ? [lat, lon] : RIOHACHA;
    const m = L.map(caja.current, { zoomControl: true, attributionControl: true }).setView(inicio, lat != null ? 17 : 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    const p = L.marker(inicio, {
      draggable: true, autoPan: true, keyboard: true, title: 'Tu casa',
      icon: L.icon({ iconUrl: './iconos/cliente.svg', iconSize: [38, 48], iconAnchor: [19, 48] }),
    }).addTo(m);
    p.on('dragend', () => { const q = p.getLatLng(); alCambiar.current(q.lat, q.lng); });
    m.on('click', (e: L.LeafletMouseEvent) => { p.setLatLng(e.latlng); alCambiar.current(e.latlng.lat, e.latlng.lng); });
    mapa.current = m;
    pin.current = p;
    return () => { m.remove(); mapa.current = null; pin.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const miUbicacion = () => {
    if (!navigator.geolocation) { setAviso('Este celular no deja ver la ubicación. Mueve el pin con el dedo.'); return; }
    setBuscando(true);
    setAviso('');
    navigator.geolocation.getCurrentPosition((pos) => {
      setBuscando(false);
      const q: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      pin.current?.setLatLng(q);
      mapa.current?.setView(q, 17);
      alCambiar.current(q[0], q[1]);
      if (pos.coords.accuracy > 80) setAviso('La ubicación no es muy exacta: revisa que el pin quede en tu casa.');
    }, () => {
      setBuscando(false);
      setAviso('No pudimos ver tu ubicación. Mueve el pin con el dedo hasta tu casa.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  return (
    <div>
      <div ref={caja} className="h-56 rounded-[5px] border border-[#E3E7EC] overflow-hidden z-0" aria-label="Mapa para marcar tu casa" />
      <div className="flex items-center justify-between gap-2 mt-2">
        <p className="text-[13px] text-[#5B6670]">{lat != null ? 'Casa marcada. Puedes mover el pin.' : 'Toca el mapa o arrastra el pin hasta tu casa.'}</p>
        <button type="button" onClick={miUbicacion} disabled={buscando}
          className="shrink-0 h-11 px-3 rounded-[5px] border border-[#005198] text-[#005198] font-poppins font-semibold text-[13px] flex items-center gap-1.5 disabled:opacity-60">
          <LocateFixed size={16} />{buscando ? 'Buscando…' : 'Usar mi ubicación'}
        </button>
      </div>
      {aviso && <p className="text-[13px] text-[#8A4B00] mt-1">{aviso}</p>}
    </div>
  );
}
