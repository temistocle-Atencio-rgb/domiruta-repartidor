import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Parada, RutaSalida } from '../types.ts';
import { pegarALaCalle } from '../utils/geo.ts';
import { Navigation } from 'lucide-react';

interface MapaRutaProps {
  paradas: Parada[];
  rutaSalidaData?: RutaSalida | null;
  tiendaLat?: number | null;
  tiendaLon?: number | null;
  posicionActualGps?: { lat: number; lon: number } | null;
  mostrarMoto?: boolean;
  className?: string;
  onCentrarMotoClick?: () => void;
}

export const MapaRuta: React.FC<MapaRutaProps> = ({
  paradas,
  rutaSalidaData,
  tiendaLat,
  tiendaLon,
  posicionActualGps,
  mostrarMoto = false,
  className = 'h-[45vh] w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Capas Leaflet
  const rutaLayerRef = useRef<L.Polyline | null>(null);
  const marcadoresParadasRef = useRef<L.Marker[]>([]);
  const marcadorTiendaRef = useRef<L.Marker | null>(null);
  const marcadorMotoRef = useRef<L.Marker | null>(null);

  // Estado para la animación y orientación de la moto
  const [orientacionMoto, setOrientacionMoto] = useState<'este' | 'oeste'>('este');
  const orientacionMotoRef = useRef<'este' | 'oeste'>('este');
  orientacionMotoRef.current = orientacionMoto;

  const [animandoFlip, setAnimandoFlip] = useState<boolean>(false);

  // Referencias para animación fluida con requestAnimationFrame
  const posicionAnimadaRef = useRef<[number, number] | null>(null);
  const posicionObjetivoRef = useRef<[number, number] | null>(null);
  const animacionRafIdRef = useRef<number | null>(null);
  const ultimoLonRef = useRef<number | null>(null);

  // 1. Inicializar mapa Leaflet con OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const rioHachaDefault: [number, number] = [11.5444, -72.9072];

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(rioHachaDefault, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Dibujar polilínea de la ruta
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (rutaLayerRef.current) {
      rutaLayerRef.current.remove();
      rutaLayerRef.current = null;
    }

    if (rutaSalidaData?.ruta && rutaSalidaData.ruta.length > 1) {
      const poly = L.polyline(rutaSalidaData.ruta, {
        color: '#005198',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      rutaLayerRef.current = poly;
    }
  }, [rutaSalidaData?.ruta]);

  // 3. Dibujar tienda y paradas en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Limpiar marcadores anteriores de paradas
    marcadoresParadasRef.current.forEach((m) => m.remove());
    marcadoresParadasRef.current = [];

    if (marcadorTiendaRef.current) {
      marcadorTiendaRef.current.remove();
      marcadorTiendaRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // Marcador de tienda
    const tLat = tiendaLat ?? rutaSalidaData?.tienda_lat;
    const tLon = tiendaLon ?? rutaSalidaData?.tienda_lon;

    if (typeof tLat === 'number' && typeof tLon === 'number') {
      const tiendaIcon = L.icon({
        iconUrl: './iconos/tienda.svg',
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48],
      });

      const mTienda = L.marker([tLat, tLon], { icon: tiendaIcon })
        .addTo(map)
        .bindPopup('<strong style="font-family: \'Poppins\', sans-serif;">Tienda</strong>');

      marcadorTiendaRef.current = mTienda;
      bounds.extend([tLat, tLon]);
    }

    // Marcadores de paradas
    paradas.forEach((parada) => {
      if (typeof parada.lat !== 'number' || typeof parada.lon !== 'number') return;

      let icon: L.Icon | L.DivIcon;

      if (parada.estado === 'entregado') {
        icon = L.icon({
          iconUrl: './iconos/cliente-entregado.svg',
          iconSize: [36, 48],
          iconAnchor: [18, 48],
          popupAnchor: [0, -48],
        });
      } else if (parada.estado === 'no_entregado') {
        icon = L.icon({
          iconUrl: './iconos/cliente-no-entregado.svg',
          iconSize: [36, 48],
          iconAnchor: [18, 48],
          popupAnchor: [0, -48],
        });
      } else {
        // Parada pendiente numerada
        icon = L.divIcon({
          className: 'domiruta-pin-numero',
          html: `
            <div style="position: relative; width: 36px; height: 48px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.18));">
              <img src="./iconos/cliente-numero.svg" style="width: 36px; height: 48px; display: block;" alt="" />
              <span style="position: absolute; top: 8px; left: 0; width: 36px; text-align: center; color: #FFFFFF; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; line-height: 1; pointer-events: none;">
                ${parada.orden}
              </span>
            </div>
          `,
          iconSize: [36, 48],
          iconAnchor: [18, 48],
          popupAnchor: [0, -48],
        });
      }

      const m = L.marker([parada.lat, parada.lon], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:'Inter',sans-serif; font-size:13px;">
            <strong style="font-family:'Poppins',sans-serif; color:#003A73;">#${parada.orden} · ${parada.nombre}</strong><br/>
            ${parada.direccion}
          </div>`
        );

      marcadoresParadasRef.current.push(m);
      bounds.extend([parada.lat, parada.lon]);
    });

    // Si hay ruta, incluirla en los límites
    if (rutaSalidaData?.ruta && rutaSalidaData.ruta.length > 0) {
      rutaSalidaData.ruta.forEach((pt) => bounds.extend(pt));
    }

    // Ajustar zoom para que se vea todo si no estamos en modo moto en vivo activa
    if (bounds.isValid() && (!mostrarMoto || !posicionActualGps)) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 });
    }
  }, [paradas, tiendaLat, tiendaLon, rutaSalidaData, mostrarMoto, posicionActualGps]);

  // 4. Lógica de la Moto en vivo: Pegar a la calle, Orientación este/oeste, Animación suave
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mostrarMoto || !posicionActualGps) {
      if (marcadorMotoRef.current) {
        marcadorMotoRef.current.remove();
        marcadorMotoRef.current = null;
      }
      return;
    }

    // Pegar la lectura GPS a la calle o ruta
    const puntoPegado = pegarALaCalle(
      [posicionActualGps.lat, posicionActualGps.lon],
      rutaSalidaData?.ruta,
      rutaSalidaData?.calles
    );

    // Detección de movimiento este/oeste (solo si el cambio es claro para no temblar en calles norte-sur)
    if (ultimoLonRef.current !== null) {
      const deltaLon = puntoPegado[1] - ultimoLonRef.current;
      // Umbral de ~10 metros longitudinales
      if (Math.abs(deltaLon) >= 0.00009) {
        const nuevaOrientacion = deltaLon > 0 ? 'este' : 'oeste';
        if (nuevaOrientacion !== orientacionMotoRef.current) {
          setOrientacionMoto(nuevaOrientacion);
          setAnimandoFlip(true);
          setTimeout(() => setAnimandoFlip(false), 170);
        }
      }
    }
    ultimoLonRef.current = puntoPegado[1];

    posicionObjetivoRef.current = puntoPegado;

    // Si es la primera vez que se ubica la moto
    if (!posicionAnimadaRef.current) {
      posicionAnimadaRef.current = puntoPegado;
    }

    // Crear marcador de moto si no existe
    const archivoSvgMoto =
      orientacionMotoRef.current === 'oeste'
        ? './iconos/moto-izq.svg'
        : './iconos/moto.svg';

    const iconoMotoDiv = L.divIcon({
      className: 'domiruta-moto-marker',
      html: `
        <div style="position: relative; width: 56px; height: 60px;">
          <!-- Sombra ovalada suave debajo de la moto -->
          <div style="position: absolute; bottom: 2px; left: 10px; width: 36px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 50%; filter: blur(2px);"></div>
          <!-- Moto con animación de volteo al cambiar rumbo -->
          <div class="${animandoFlip ? 'anim-flip-moto' : ''}" style="width: 56px; height: 60px; will-change: transform;">
            <img src="${archivoSvgMoto}" style="width: 56px; height: 60px; display: block;" alt="Moto repartidor" />
          </div>
        </div>
      `,
      iconSize: [56, 60],
      iconAnchor: [28, 56],
    });

    if (!marcadorMotoRef.current) {
      marcadorMotoRef.current = L.marker(posicionAnimadaRef.current, {
        icon: iconoMotoDiv,
        zIndexOffset: 1000,
      }).addTo(map);

      // Centrar el mapa en la moto al iniciar
      map.setView(puntoPegado, 16, { animate: true });
    } else {
      marcadorMotoRef.current.setIcon(iconoMotoDiv);
    }

    // Animación suave de deslizamiento con requestAnimationFrame
    if (animacionRafIdRef.current) {
      cancelAnimationFrame(animacionRafIdRef.current);
    }

    const animarDeslizamiento = () => {
      if (!posicionAnimadaRef.current || !posicionObjetivoRef.current) return;

      const [curLat, curLon] = posicionAnimadaRef.current;
      const [tarLat, tarLon] = posicionObjetivoRef.current;

      const dLat = tarLat - curLat;
      const dLon = tarLon - curLon;

      // Si ya está muy cerca, completar
      if (Math.abs(dLat) < 0.000005 && Math.abs(dLon) < 0.000005) {
        posicionAnimadaRef.current = [tarLat, tarLon];
        marcadorMotoRef.current?.setLatLng([tarLat, tarLon]);
        return;
      }

      // Interpolación lineal con amortiguación suave (lerp)
      const factorLerp = 0.08;
      const nextLat = curLat + dLat * factorLerp;
      const nextLon = curLon + dLon * factorLerp;

      posicionAnimadaRef.current = [nextLat, nextLon];
      marcadorMotoRef.current?.setLatLng([nextLat, nextLon]);

      animacionRafIdRef.current = requestAnimationFrame(animarDeslizamiento);
    };

    animacionRafIdRef.current = requestAnimationFrame(animarDeslizamiento);

    return () => {
      if (animacionRafIdRef.current) {
        cancelAnimationFrame(animacionRafIdRef.current);
      }
    };
  }, [posicionActualGps, mostrarMoto, rutaSalidaData, orientacionMoto, animandoFlip]);

  // Centrar mapa en la moto
  const handleCentrarEnMoto = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const destino =
      posicionAnimadaRef.current ||
      (posicionActualGps ? [posicionActualGps.lat, posicionActualGps.lon] : null);
    if (destino) {
      map.setView([destino[0], destino[1]], 16, { animate: true });
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Botón flotante discreto en el mapa para centrar en la moto ("Mi posición") */}
      {mostrarMoto && posicionActualGps && (
        <button
          type="button"
          onClick={handleCentrarEnMoto}
          className="absolute bottom-3 right-3 z-[400] bg-white text-[#003A73] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.15)] rounded-[5px] px-3 py-1.5 text-xs font-poppins font-semibold flex items-center gap-1.5 hover:bg-[#F2F4F7] active:bg-[#E3E7EC] transition-colors cursor-pointer select-none"
          title="Centrar mapa en la moto"
          aria-label="Centrar mapa en mi posición"
        >
          <Navigation className="w-3.5 h-3.5 text-[#005198]" strokeWidth={2.2} />
          <span>Mi posición</span>
        </button>
      )}
    </div>
  );
};
