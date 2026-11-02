import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle } from 'lucide-react';

interface DestinoCliente {
  lat: number;
  lon: number;
}

interface MotoCliente {
  lat: number;
  lon: number;
  rumbo: number | null;
  hora: string;
}

interface MapaClienteProps {
  destino: DestinoCliente | null;
  moto: MotoCliente | null;
  ubicacionPausada: boolean;
  className?: string;
}

export const MapaCliente: React.FC<MapaClienteProps> = ({
  destino,
  moto,
  ubicacionPausada,
  className = 'h-[50vh] min-h-[260px] w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Marcadores Leaflet
  const marcadorCasaRef = useRef<L.Marker | null>(null);
  const marcadorMotoRef = useRef<L.Marker | null>(null);

  // Detección de si el usuario movió o alejó el mapa con sus dedos/mouse
  const usuarioInteractuoRef = useRef<boolean>(false);

  // Orientación y animación de la moto
  const [orientacionMoto, setOrientacionMoto] = useState<'este' | 'oeste'>('este');
  const orientacionMotoRef = useRef<'este' | 'oeste'>('este');
  orientacionMotoRef.current = orientacionMoto;

  const [animandoFlip, setAnimandoFlip] = useState<boolean>(false);

  // Referencias para animación fluida con requestAnimationFrame (aprox 1.2s)
  const posicionAnimadaRef = useRef<[number, number] | null>(null);
  const posicionObjetivoRef = useRef<[number, number] | null>(null);
  const animacionRafIdRef = useRef<number | null>(null);
  const ultimoLonRef = useRef<number | null>(null);

  // 1. Inicializar mapa Leaflet con OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Coordenadas por defecto (o de destino)
    const centroInicial: [number, number] = destino
      ? [destino.lat, destino.lon]
      : [11.5444, -72.9072]; // Riohacha

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(centroInicial, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Si el usuario mueve o hace zoom en el mapa, respetamos su interacción
    const marcarInteraccionUsuario = (e: L.LeafletEvent) => {
      // Solo si fue una acción iniciada por el usuario (toque, arrastre, zoom)
      // Leaflet propaga originalEvent en eventos de interacción directa
      const domEvent = (e as unknown as { originalEvent?: Event }).originalEvent;
      if (domEvent) {
        usuarioInteractuoRef.current = true;
      }
    };

    map.on('dragstart', () => {
      usuarioInteractuoRef.current = true;
    });
    map.on('zoomstart', marcarInteraccionUsuario);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Marcador de la casa del cliente
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !destino) return;

    if (!marcadorCasaRef.current) {
      const iconoCasa = L.icon({
        iconUrl: './iconos/cliente.svg',
        iconSize: [38, 48],
        iconAnchor: [19, 48],
      });

      const marker = L.marker([destino.lat, destino.lon], {
        icon: iconoCasa,
        zIndexOffset: 500,
      }).addTo(map);

      marcadorCasaRef.current = marker;
    } else {
      marcadorCasaRef.current.setLatLng([destino.lat, destino.lon]);
    }
  }, [destino]);

  // 3. Marcador de la moto con interpolación suave y giro
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const motoDisponible = moto && !ubicacionPausada;

    if (!motoDisponible) {
      if (marcadorMotoRef.current) {
        marcadorMotoRef.current.remove();
        marcadorMotoRef.current = null;
      }
      posicionAnimadaRef.current = null;
      posicionObjetivoRef.current = null;
      return;
    }

    const nuevaLat = moto.lat;
    const nuevaLon = moto.lon;

    // Determinar rumbo/orientación este u oeste
    let nuevaOrientacion: 'este' | 'oeste' = orientacionMotoRef.current;
    if (moto.rumbo !== null && !isNaN(moto.rumbo)) {
      // Rumbo 0° a 180° = oriente (este); 180° a 360° = occidente (oeste)
      nuevaOrientacion = moto.rumbo > 180 && moto.rumbo < 360 ? 'oeste' : 'este';
    } else if (ultimoLonRef.current !== null) {
      const deltaLon = nuevaLon - ultimoLonRef.current;
      if (Math.abs(deltaLon) >= 0.00008) {
        nuevaOrientacion = deltaLon < 0 ? 'oeste' : 'este';
      }
    }
    ultimoLonRef.current = nuevaLon;

    if (nuevaOrientacion !== orientacionMotoRef.current) {
      setOrientacionMoto(nuevaOrientacion);
      setAnimandoFlip(true);
      setTimeout(() => setAnimandoFlip(false), 160);
    }

    posicionObjetivoRef.current = [nuevaLat, nuevaLon];

    if (!posicionAnimadaRef.current) {
      posicionAnimadaRef.current = [nuevaLat, nuevaLon];
    }

    const archivoSvgMoto =
      orientacionMotoRef.current === 'oeste'
        ? './iconos/moto-izq.svg'
        : './iconos/moto.svg';

    const iconoMotoDiv = L.divIcon({
      className: 'domiruta-moto-marker',
      html: `
        <div style="position: relative; width: 56px; height: 60px;">
          <div style="position: absolute; bottom: 3px; left: 10px; width: 36px; height: 10px; background: rgba(0,0,0,0.22); border-radius: 50%; filter: blur(2px);"></div>
          <div class="${animandoFlip ? 'anim-flip-moto' : ''}" style="width: 56px; height: 60px; will-change: transform;">
            <img src="${archivoSvgMoto}" style="width: 56px; height: 60px; display: block;" alt="Moto del repartidor" />
          </div>
        </div>
      `,
      iconSize: [56, 60],
      iconAnchor: [28, 54],
    });

    if (!marcadorMotoRef.current) {
      marcadorMotoRef.current = L.marker(posicionAnimadaRef.current, {
        icon: iconoMotoDiv,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      marcadorMotoRef.current.setIcon(iconoMotoDiv);
    }

    // Cancelar animación anterior si estaba en curso
    if (animacionRafIdRef.current) {
      cancelAnimationFrame(animacionRafIdRef.current);
    }

    // Interpolación lineal suave con amortiguación (~1.2s total)
    const factorLerp = 0.08; // Transición amortiguada por frame
    const animarDeslizamiento = () => {
      if (!posicionAnimadaRef.current || !posicionObjetivoRef.current) return;

      const [curLat, curLon] = posicionAnimadaRef.current;
      const [tarLat, tarLon] = posicionObjetivoRef.current;

      const dLat = tarLat - curLat;
      const dLon = tarLon - curLon;

      if (Math.abs(dLat) < 0.000005 && Math.abs(dLon) < 0.000005) {
        posicionAnimadaRef.current = [tarLat, tarLon];
        marcadorMotoRef.current?.setLatLng([tarLat, tarLon]);
        return;
      }

      const sigLat = curLat + dLat * factorLerp;
      const sigLon = curLon + dLon * factorLerp;

      posicionAnimadaRef.current = [sigLat, sigLon];
      marcadorMotoRef.current?.setLatLng([sigLat, sigLon]);

      animacionRafIdRef.current = requestAnimationFrame(animarDeslizamiento);
    };

    animacionRafIdRef.current = requestAnimationFrame(animarDeslizamiento);

    return () => {
      if (animacionRafIdRef.current) {
        cancelAnimationFrame(animacionRafIdRef.current);
      }
    };
  }, [moto, ubicacionPausada, animandoFlip]);

  // 4. Encuadre del mapa (solo si el cliente NO ha interactuado moviendo el mapa)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (usuarioInteractuoRef.current) {
      // El cliente movió o acercó el mapa manualmente: respetamos su vista
      return;
    }

    const motoDisponible = moto && !ubicacionPausada;

    if (destino && motoDisponible) {
      // Encuadrar casa y moto juntas con margen generoso
      const bounds = L.latLngBounds([
        [destino.lat, destino.lon],
        [moto.lat, moto.lon],
      ]);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 17,
        animate: true,
      });
    } else if (destino) {
      // Solo la casa disponible
      map.setView([destino.lat, destino.lon], 16, { animate: true });
    }
  }, [destino, moto?.lat, moto?.lon, ubicacionPausada]);

  const avisoUbicacionNoDisponible = !moto || ubicacionPausada;

  return (
    <div className="relative w-full overflow-hidden flex flex-col">
      {/* Aviso de ubicación no disponible (si moto es null o ubicación pausada) */}
      {avisoUbicacionNoDisponible && (
        <div
          role="status"
          className="bg-[#FDEBD3] border-b border-[#F28C1B]/30 px-3.5 py-2 flex items-center justify-center gap-2 text-[13px] font-inter font-medium text-[#8A4B00] z-20"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#8A4B00]" strokeWidth={2} />
          <span>Ubicación del repartidor no disponible por ahora</span>
        </div>
      )}

      {/* Contenedor del mapa Leaflet */}
      <div ref={mapContainerRef} className={`${className} bg-[#E3E7EC] z-10`} />

      {/* Texto suave debajo del mapa según requerimiento */}
      <div className="bg-white py-2.5 px-4 text-center border-b border-[#E3E7EC]">
        <p className="font-inter text-[13.5px] text-[#5B6670] m-0">
          Te avisamos aquí mismo cuando llegue
        </p>
      </div>
    </div>
  );
};
