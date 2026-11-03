import React, { useState, useRef } from 'react';
import { Parada } from '../types.ts';
import { formatearPesos, subirFoto } from '../supabase.ts';
import { comprimirFoto } from '../utils/image.ts';
import { Phone, Navigation, RotateCcw, Check, XCircle } from 'lucide-react';
import { Camera } from '../iconos/Icono';

interface TarjetaParadaProps {
  parada: Parada;
  codigo: string;
  esDestacada?: boolean;
  esNueva?: boolean;
  cargandoEstaParada: boolean;
  fotoEnMemoria?: string;
  onMarcarEntregado: (parada: Parada) => void;
  onAbrirModalNoEntregado: (parada: Parada) => void;
  onDeshacer: (parada: Parada) => void;
  onFotoSubidaExito: (paradaId: string | number, dataUrl: string) => void;
  onMostrarError: (mensaje: string) => void;
  onVerFotoGrande: (url: string, nombre: string) => void;
  salidaAceptada?: boolean;
  onCorregirUbicacion?: (parada: Parada) => void;
  tienda?: string;
}

export const TarjetaParada: React.FC<TarjetaParadaProps> = ({
  parada,
  codigo,
  esDestacada = true,
  esNueva = false,
  cargandoEstaParada,
  fotoEnMemoria,
  onMarcarEntregado,
  onAbrirModalNoEntregado,
  onDeshacer,
  onFotoSubidaExito,
  onMostrarError,
  onVerFotoGrande,
  salidaAceptada = false,
  onCorregirUbicacion,
  tienda = '',
}) => {
  const [elegirNavegador, setElegirNavegador] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tieneTelefono = Boolean(parada.telefono && parada.telefono.trim().length > 0);
  const tieneCoordenadas = typeof parada.lat === 'number' && typeof parada.lon === 'number';

  // Enlace para WhatsApp en Colombia (+57)
  let urlWhatsApp: string | null = null;
  if (tieneTelefono && parada.telefono) {
    const digitos = parada.telefono.replace(/\D/g, '');
    if (digitos.length > 0) {
      const numeroCol = digitos.startsWith('57') && digitos.length >= 12 ? digitos : `57${digitos}`;
      const primerNombre = (parada.nombre || '').trim().split(/\s+/)[0] || '';
      const deTienda = tienda.trim() ? `el domiciliario de ${tienda.trim()}` : 'tu domiciliario';
      const texto = `Hola${primerNombre ? ' ' + primerNombre : ''}, soy ${deTienda}. Estoy afuera con tu pedido.`;
      urlWhatsApp = `https://wa.me/${numeroCol}?text=${encodeURIComponent(texto)}`;
    }
  }

  // Cálculos de cobro y cambio
  const debeCobrar = parada.cobrar > 0;
  const montoCambio =
    typeof parada.cambio_de === 'number' && parada.cambio_de > 0
      ? parada.cambio_de
      : parada.paga_con > parada.cobrar
      ? parada.paga_con - parada.cobrar
      : 0;

  const urlComoLlegar = tieneCoordenadas
    ? `https://www.google.com/maps/dir/?api=1&destination=${parada.lat},${parada.lon}&travelmode=driving`
    : null;
  const urlWaze = tieneCoordenadas ? `https://waze.com/ul?ll=${parada.lat},${parada.lon}&navigate=yes` : null;
  let preferido = 'google';
  try {
    preferido = localStorage.getItem('domiruta_navegador') || 'google';
  } catch {
    // sin almacenamiento: Google Maps de primero
  }
  const opcionesNavegador = [
    { clave: 'google', texto: 'Google Maps', url: urlComoLlegar },
    { clave: 'waze', texto: 'Waze', url: urlWaze },
  ].sort((a, b) => (a.clave === preferido ? -1 : b.clave === preferido ? 1 : 0));
  const recordarNavegador = (clave: string) => {
    try {
      localStorage.setItem('domiruta_navegador', clave);
    } catch {
      // no importa
    }
    setElegirNavegador(false);
  };

  // Línea de venta y productos
  const tieneVenta = Boolean(parada.venta && parada.venta.trim().length > 0);
  const textoVenta = tieneVenta
    ? parada.productos && parada.productos > 0
      ? `Venta N.º ${parada.venta} · ${parada.productos} ${parada.productos === 1 ? 'producto' : 'productos'}`
      : `Venta N.º ${parada.venta}`
    : null;

  // Manejar captura y compresión de foto de entrega
  const handleSeleccionarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFoto(true);
    try {
      const dataUrl = await comprimirFoto(file);
      const exito = await subirFoto(codigo, parada.id, dataUrl);
      if (exito) {
        onFotoSubidaExito(parada.id, dataUrl);
      } else {
        onMostrarError('No se pudo subir la foto. Revisa el internet');
      }
    } catch (err: unknown) {
      console.error('Error al procesar foto:', err);
      if (err instanceof Error && err.message === 'La foto es muy pesada. Toma otra') {
        onMostrarError('La foto es muy pesada. Toma otra');
      } else {
        onMostrarError('No se pudo subir la foto. Revisa el internet');
      }
    } finally {
      setSubiendoFoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <article
      className={`bg-white rounded-[5px] p-4 transition-all duration-200 ${
        esDestacada
          ? 'border-2 border-[#005198] shadow-[0_2px_10px_rgba(0,81,152,0.14)]'
          : esNueva
          ? 'border-2 border-[#005198] shadow-[0_0_0_3px_rgba(0,81,152,0.18)]'
          : 'border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
      }`}
      aria-label={`Parada número ${parada.orden}: ${parada.nombre}`}
    >
      {/* Cabecera de la parada: Número grande y Nombre */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-11 h-11 rounded-[5px] bg-[#003A73]/10 border border-[#003A73]/20 flex items-center justify-center">
          <span className="font-poppins font-bold text-[22px] text-[#003A73] leading-none">
            {parada.orden}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-poppins font-bold text-[17px] text-[#1F2933] leading-snug break-words m-0">
              {parada.nombre}
            </h2>
            {esDestacada && (
              <span className="text-[11px] font-poppins font-bold text-[#005198] uppercase tracking-wide">
                Siguiente
              </span>
            )}
          </div>

          {/* Dirección completa sin cortar */}
          <p className="font-inter text-[14px] text-[#1F2933] mt-1 mb-0 break-words font-medium leading-snug">
            {parada.direccion}
          </p>

          {/* Número de venta y productos */}
          {textoVenta && (
            <p className="font-inter text-[13px] text-[#5B6670] mt-1 mb-0">
              {textoVenta}
            </p>
          )}

          {parada.referencia && (
            <p className="font-inter text-[13px] text-[#5B6670] mt-0.5 mb-0 italic break-words">
              Ref: {parada.referencia}
            </p>
          )}
        </div>
      </div>

      {/* Sección de Cobro y Cambio */}
      <div className="mt-3.5 pt-3 border-t border-[#E3E7EC]">
        {debeCobrar ? (
          <div>
            <div className="font-poppins font-bold text-[22px] text-[#003A73] leading-tight">
              COBRAR {formatearPesos(parada.cobrar)}
            </div>
            {montoCambio > 0 && (
              <div className="font-inter text-[13.5px] text-[#5B6670] mt-0.5 font-medium">
                Llevar cambio de {formatearPesos(montoCambio)}
                {parada.paga_con > 0 && ` (paga con ${formatearPesos(parada.paga_con)})`}
              </div>
            )}
            {montoCambio === 0 && parada.paga_con > 0 && (
              <div className="font-inter text-[13px] text-[#5B6670] mt-0.5">
                Pago exacto ({formatearPesos(parada.paga_con)})
              </div>
            )}
          </div>
        ) : (
          <div className="font-poppins font-bold text-[17px] text-[#1E7A44] leading-tight flex items-center gap-1.5">
            <Check className="w-5 h-5 text-[#1E7A44]" strokeWidth={2.5} />
            YA PAGÓ
          </div>
        )}
      </div>

      {/* Botones de contacto y navegación: Llamar, WhatsApp, Cómo llegar */}
      {(tieneTelefono || tieneCoordenadas) && (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {tieneTelefono ? (
            <a
              href={`tel:${parada.telefono}`}
              className="min-h-[48px] px-2 bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#005198] border border-[#005198] rounded-[5px] font-poppins font-semibold text-[12px] leading-tight flex flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer select-none text-center"
              aria-label={`Llamar a ${parada.nombre} al ${parada.telefono}`}
            >
              <Phone className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span>Llamar</span>
            </a>
          ) : (
            <div />
          )}

          {urlWhatsApp ? (
            <a
              href={urlWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-2 bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#1E7A44] border border-[#1E7A44] rounded-[5px] font-poppins font-semibold text-[12px] leading-tight flex flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer select-none text-center"
              aria-label={`Escribir por WhatsApp a ${parada.nombre}`}
            >
              <img src="./iconos/whatsapp.svg" alt="" aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <div />
          )}

          {urlComoLlegar ? (
            <button
              type="button"
              onClick={() => setElegirNavegador((v) => !v)}
              aria-expanded={elegirNavegador}
              className="min-h-[48px] px-2 bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#005198] border border-[#005198] rounded-[5px] font-poppins font-semibold text-[12px] leading-tight flex flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer select-none text-center"
              aria-label={`Cómo llegar a ${parada.direccion}`}
            >
              <Navigation className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span className="truncate">Cómo llegar</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Escoger con qué app llegar (se recuerda la última) */}
      {elegirNavegador && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {opcionesNavegador.map((o) =>
            o.url ? (
              <a
                key={o.clave}
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordarNavegador(o.clave)}
                className="min-h-[48px] px-2 bg-white hover:bg-[#F2F4F7] text-[#003A73] border border-[#E3E7EC] rounded-[5px] font-poppins font-semibold text-[13px] flex items-center justify-center cursor-pointer select-none"
              >
                {o.texto}
              </a>
            ) : null
          )}
        </div>
      )}

      {parada.pendiente_envio && (
        <p className="mt-2 mb-0 font-inter text-[13px] text-[#5B6670]">Se enviará al volver la señal</p>
      )}

      {/* Estados y Acciones de la entrega */}
      <div className="mt-4 pt-3 border-t border-[#E3E7EC]">
        {parada.estado === 'entregado' ? (
          /* Tarjeta ya marcada como Entregado */
          <div className="space-y-3">
            <div className="flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-[#1E7A44]" strokeWidth={2.5} />
                <span className="font-poppins font-bold text-[16px] text-[#1E7A44]">
                  Entregado
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDeshacer(parada)}
                disabled={cargandoEstaParada || subiendoFoto}
                className="min-h-[44px] px-3 py-1 text-[#005198] hover:text-[#003A73] hover:underline font-inter text-[13.5px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{cargandoEstaParada ? 'Cambiando...' : 'Deshacer'}</span>
              </button>
            </div>

            {/* Foto de entrega con miniatura 56x56 px */}
            <div className="pt-2 border-t border-[#E3E7EC]/60">
              {subiendoFoto ? (
                <div className="space-y-1.5 py-1">
                  <div className="flex items-center gap-2 font-inter text-xs text-[#003A73] font-medium">
                    <span className="w-3.5 h-3.5 border-2 border-[#003A73] border-t-transparent rounded-full animate-spin" />
                    <span>Enviando foto…</span>
                  </div>
                  <div className="w-full h-1 bg-[#E3E7EC] rounded-full overflow-hidden">
                    <div className="h-full bg-[#005198] w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : parada.tiene_foto ? (
                <div className="flex items-center gap-3">
                  {fotoEnMemoria ? (
                    <button
                      type="button"
                      onClick={() => onVerFotoGrande(fotoEnMemoria, parada.nombre)}
                      className="w-14 h-14 rounded-[5px] overflow-hidden border border-[#E3E7EC] relative flex-shrink-0 cursor-pointer hover:opacity-90 active:opacity-75 transition-opacity"
                      aria-label="Ver foto en tamaño completo"
                    >
                      <img
                        src={fotoEnMemoria}
                        alt="Miniatura entrega"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-14 h-14 rounded-[5px] bg-[#F2F4F7] border border-[#E3E7EC] flex items-center justify-center flex-shrink-0">
                      <Camera className="w-6 h-6 text-[#5B6670]" strokeWidth={1.75} />
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="font-inter text-[13.5px] font-medium text-[#1E7A44] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#1E7A44]" strokeWidth={2.5} />
                      Foto enviada
                    </span>
                    <label className="text-[#005198] hover:text-[#003A73] hover:underline font-inter text-[12.5px] font-medium cursor-pointer mt-0.5 inline-block">
                      Cambiar foto
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleSeleccionarFoto}
                        disabled={subiendoFoto}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="text-[#005198] hover:text-[#003A73] hover:underline font-inter text-[13.5px] font-medium inline-flex items-center gap-1.5 py-1.5 cursor-pointer">
                  <Camera className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <span>Agregar foto</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleSeleccionarFoto}
                    disabled={subiendoFoto || cargandoEstaParada}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          </div>
        ) : parada.estado === 'no_entregado' ? (
          /* Tarjeta ya marcada como No entregado */
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <XCircle className="w-5 h-5 text-[#B03030] flex-shrink-0" strokeWidth={2} />
              <span className="font-poppins font-bold text-[15px] text-[#B03030] truncate">
                No entregado · {parada.motivo || 'Sin motivo'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDeshacer(parada)}
              disabled={cargandoEstaParada}
              className="flex-shrink-0 min-h-[44px] px-3 py-1 text-[#005198] hover:text-[#003A73] hover:underline font-inter text-[13.5px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{cargandoEstaParada ? 'Cambiando...' : 'Deshacer'}</span>
            </button>
          </div>
        ) : (
          /* Parada en camino */
          <div className="space-y-2.5">
            {/* Si es destacada: ÚNICO botón naranja principal por pantalla */}
            {esDestacada ? (
              <button
                type="button"
                onClick={() => onMarcarEntregado(parada)}
                disabled={cargandoEstaParada}
                className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07f15] active:bg-[#cc710e] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 cursor-pointer select-none"
              >
                {cargandoEstaParada ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#1F2933] border-t-transparent rounded-full animate-spin" />
                    Guardando entrega...
                  </span>
                ) : (
                  <>
                    <Check className="w-5 h-5 text-[#1F2933]" strokeWidth={2.5} />
                    <span>Entregué</span>
                  </>
                )}
              </button>
            ) : (
              /* Si no es destacada: botón azul para respetar la regla de un solo botón naranja */
              <button
                type="button"
                onClick={() => onMarcarEntregado(parada)}
                disabled={cargandoEstaParada}
                className="w-full h-[48px] bg-[#005198] hover:bg-[#003A73] active:bg-[#002b55] text-white rounded-[5px] font-poppins font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 cursor-pointer select-none"
              >
                {cargandoEstaParada ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando entrega...
                  </span>
                ) : (
                  <>
                    <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                    <span>Entregué</span>
                  </>
                )}
              </button>
            )}

            {/* Botón secundario: "No pude entregar" */}
            <button
              type="button"
              onClick={() => onAbrirModalNoEntregado(parada)}
              disabled={cargandoEstaParada}
              className="w-full h-[48px] bg-transparent hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#5B6670] hover:text-[#1F2933] border border-[#E3E7EC] rounded-[5px] font-poppins font-medium text-[14px] flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              No pude entregar
            </button>

            {/* Opción para corregir ubicación si la salida está aceptada */}
            {salidaAceptada && onCorregirUbicacion && (
              <button
                type="button"
                onClick={() => onCorregirUbicacion(parada)}
                disabled={cargandoEstaParada}
                className="w-full min-h-[48px] bg-transparent text-[#005198] hover:text-[#003A73] hover:underline font-poppins font-medium text-[14px] flex items-center justify-center transition-colors cursor-pointer select-none"
              >
                La casa no está aquí
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
