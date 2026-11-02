import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Parada } from '../types.ts';
import { distanciaHaversine } from '../utils/geo.ts';
import { corregirUbicacion } from '../supabase.ts';

interface ModalCorregirUbicacionProps {
  parada: Parada;
  codigo: string;
  posicionGps: { lat: number; lon: number } | null;
  obtenerGpsFresco: () => { lat: number; lon: number } | null;
  onCerrar: () => void;
  onExito: (
    paradaId: string | number,
    nuevaLat: number,
    nuevaLon: number,
    tipo: 'aplicada' | 'pendiente'
  ) => void;
}

export const ModalCorregirUbicacion: React.FC<ModalCorregirUbicacionProps> = ({
  parada,
  codigo,
  posicionGps,
  obtenerGpsFresco,
  onCerrar,
  onExito,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  // Punto viejo de la parada
  const puntoViejoLat = typeof parada.lat === 'number' ? parada.lat : 11.5444;
  const puntoViejoLon = typeof parada.lon === 'number' ? parada.lon : -72.9072;

  // Estado del pin que se arrastra
  const [posicionPin, setPosicionPin] = useState<[number, number]>([puntoViejoLat, puntoViejoLon]);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Calcular si queda a más de 300 m del punto que tenía la parada
  const distanciaMetros = distanciaHaversine(
    puntoViejoLat,
    puntoViejoLon,
    posicionPin[0],
    posicionPin[1]
  );
  const quedaMuyLejos = distanciaMetros > 300;

  // Inicializar Leaflet map a pantalla completa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([puntoViejoLat, puntoViejoLon], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Círculo azul claro (#005198, opacidad 0.12, borde #005198 de 1 px) de 300 m de radio
    const circulo = L.circle([puntoViejoLat, puntoViejoLon], {
      radius: 300,
      color: '#005198',
      weight: 1,
      fillColor: '#005198',
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(map);

    // Ajustar límites para que el círculo de 300 m se encuadre bien
    map.fitBounds(circulo.getBounds(), { padding: [35, 35] });

    // Pin pequeño gris (opacidad 0.5) en el punto viejo
    const pinGrisIcon = L.divIcon({
      className: 'domiruta-pin-viejo',
      html: `
        <div style="opacity: 0.5; filter: grayscale(100%);">
          <img src="./iconos/cliente.svg" style="width: 26px; height: 33px; display: block;" alt="" />
        </div>
      `,
      iconSize: [26, 33],
      iconAnchor: [13, 33],
    });
    L.marker([puntoViejoLat, puntoViejoLon], {
      icon: pinGrisIcon,
      interactive: false,
    }).addTo(map);

    // Moto en la posición actual del repartidor si tiene GPS
    if (posicionGps) {
      const motoIcon = L.icon({
        iconUrl: './iconos/moto.svg',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      L.marker([posicionGps.lat, posicionGps.lon], {
        icon: motoIcon,
        interactive: false,
      }).addTo(map);
    }

    // Pin de la parada (cliente.svg, 38x48 px, anclado abajo al centro) que se puede arrastrar
    const clienteIcon = L.icon({
      iconUrl: './iconos/cliente.svg',
      iconSize: [38, 48],
      iconAnchor: [19, 48],
    });

    const marker = L.marker([puntoViejoLat, puntoViejoLon], {
      icon: clienteIcon,
      draggable: true,
    }).addTo(map);

    pinMarkerRef.current = marker;

    // Al arrastrar el pin
    marker.on('drag', () => {
      const ll = marker.getLatLng();
      setPosicionPin([ll.lat, ll.lng]);
    });

    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      setPosicionPin([ll.lat, ll.lng]);
    });

    // Al tocar cualquier parte del mapa, el pin salta ahí
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setPosicionPin([e.latlng.lat, e.latlng.lng]);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [puntoViejoLat, puntoViejoLon, posicionGps]);

  // Mover el pin a la posición del repartidor
  const handleMoverAGps = () => {
    if (!posicionGps || !pinMarkerRef.current || !mapInstanceRef.current) return;
    const nuevaPos: [number, number] = [posicionGps.lat, posicionGps.lon];
    pinMarkerRef.current.setLatLng(nuevaPos);
    setPosicionPin(nuevaPos);
    mapInstanceRef.current.panTo(nuevaPos);
  };

  // Guardar ubicación
  const handleGuardar = async () => {
    if (quedaMuyLejos || guardando) return;

    setGuardando(true);
    setMensajeError(null);

    try {
      const gpsFresco = obtenerGpsFresco();
      const pGpsLat = gpsFresco ? gpsFresco.lat : null;
      const pGpsLon = gpsFresco ? gpsFresco.lon : null;

      const resultado = await corregirUbicacion(
        codigo,
        parada.id,
        posicionPin[0],
        posicionPin[1],
        pGpsLat,
        pGpsLon
      );

      if (resultado === 'aplicada' || resultado === 'pendiente') {
        onExito(parada.id, posicionPin[0], posicionPin[1], resultado);
      } else {
        setMensajeError(
          'No se pudo guardar. Puede que quede muy lejos o que ya la hayan corregido varias veces'
        );
      }
    } catch (err) {
      console.error('Error al guardar ubicación de parada:', err);
      setMensajeError('No se pudo guardar. Revisa el internet');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Mueve el pin a la casa de ${parada.nombre}`}
      className="fixed inset-0 z-50 bg-[#F2F4F7] flex flex-col animate-in fade-in duration-200"
    >
      {/* Cabecera: título y dirección como texto */}
      <header className="bg-white border-b border-[#E3E7EC] px-4 py-3 flex-shrink-0 shadow-xs">
        <h1 className="font-poppins font-bold text-[17px] text-[#003A73] leading-snug m-0">
          Mueve el pin a la casa de {parada.nombre}
        </h1>
        <p className="font-inter text-[13.5px] text-[#5B6670] mt-1 mb-0 break-words font-medium leading-snug">
          {parada.direccion}
        </p>
      </header>

      {/* Contenedor del mapa */}
      <main className="flex-1 w-full relative min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Botón de texto "Estoy en la casa" si el celular tiene GPS en ese momento */}
        {posicionGps && (
          <div className="absolute top-3 right-3 z-[1000]">
            <button
              type="button"
              onClick={handleMoverAGps}
              className="min-h-[48px] px-3.5 bg-white text-[#005198] border border-[#005198] shadow-[0_2px_8px_rgba(0,0,0,0.15)] rounded-[5px] font-poppins font-semibold text-[13px] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#F2F4F7] active:bg-[#E3E7EC] transition-colors"
            >
              <img src="./iconos/moto.svg" alt="" aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
              <span>Estoy en la casa</span>
            </button>
          </div>
        )}
      </main>

      {/* Pie de controles */}
      <footer className="bg-white border-t border-[#E3E7EC] p-4 flex-shrink-0 space-y-2.5 shadow-lg">
        {/* Aviso en rojo si queda a más de 300 m */}
        {quedaMuyLejos && (
          <p className="font-inter text-[13.5px] text-[#B03030] font-medium leading-snug m-0">
            Eso queda muy lejos. Si es otra dirección, avísale a la tienda por el chat
          </p>
        )}

        {/* Aviso de error al guardar */}
        {mensajeError && !quedaMuyLejos && (
          <p className="font-inter text-[13.5px] text-[#B03030] font-medium leading-snug m-0">
            {mensajeError}
          </p>
        )}

        {/* Botón principal naranja: Guardar ubicación */}
        <button
          type="button"
          onClick={handleGuardar}
          disabled={quedaMuyLejos || guardando}
          className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07f15] active:bg-[#cc710e] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[15px] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
        >
          {guardando ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#1F2933] border-t-transparent rounded-full animate-spin" />
              Guardando ubicación...
            </span>
          ) : (
            'Guardar ubicación'
          )}
        </button>

        {/* Botón de texto: Cancelar */}
        <button
          type="button"
          onClick={onCerrar}
          disabled={guardando}
          className="w-full min-h-[48px] bg-transparent text-[#005198] hover:text-[#003A73] hover:underline rounded-[5px] font-poppins font-medium text-[14px] flex items-center justify-center transition-colors cursor-pointer select-none"
        >
          Cancelar
        </button>
      </footer>
    </div>
  );
};
