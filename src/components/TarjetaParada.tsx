import React, { useState, useRef } from 'react';
import { Parada } from '../types.ts';
import { formatearPesos, subirFoto } from '../supabase.ts';
import { comprimirFoto } from '../utils/image.ts';
import { Phone, Navigation, RotateCcw, Check, XCircle, Camera, CheckCheck } from 'lucide-react';

interface TarjetaParadaProps {
  parada: Parada;
  codigo: string;
  esNueva?: boolean;
  cargandoEstaParada: boolean;
  fotoEnMemoria?: string;
  onMarcarEntregado: (parada: Parada) => void;
  onAbrirModalNoEntregado: (parada: Parada) => void;
  onDeshacer: (parada: Parada) => void;
  onFotoSubidaExito: (paradaId: string | number, dataUrl: string) => void;
  onMostrarError: (mensaje: string) => void;
  onVerFotoGrande: (url: string, nombre: string) => void;
}

export const TarjetaParada: React.FC<TarjetaParadaProps> = ({
  parada,
  codigo,
  esNueva = false,
  cargandoEstaParada,
  fotoEnMemoria,
  onMarcarEntregado,
  onAbrirModalNoEntregado,
  onDeshacer,
  onFotoSubidaExito,
  onMostrarError,
  onVerFotoGrande,
}) => {
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tieneTelefono = Boolean(parada.telefono && parada.telefono.trim().length > 0);
  const tieneCoordenadas = typeof parada.lat === 'number' && typeof parada.lon === 'number';

  // Cálculos de cobro y cambio
  const debeCobrar = parada.cobrar > 0;
  const tienePagaCon = parada.paga_con > 0;
  const cambio = tienePagaCon ? Math.max(0, parada.paga_con - parada.cobrar) : 0;

  const urlComoLlegar = tieneCoordenadas
    ? `https://www.google.com/maps/dir/?api=1&destination=${parada.lat},${parada.lon}`
    : null;

  // Requisito 1: Línea de venta y productos
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
        esNueva
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
          <h2 className="font-poppins font-bold text-[17px] text-[#1F2933] leading-snug break-words m-0">
            {parada.nombre}
          </h2>
          <p className="font-inter text-[14px] text-[#1F2933] mt-0.5 mb-0 break-words font-medium">
            {parada.direccion}
          </p>

          {/* Requisito 1: Número de venta y productos debajo de la dirección */}
          {textoVenta && (
            <p className="font-inter text-[13px] text-[#5B6670] mt-0.5 mb-0">
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

      {/* Sección de Cobro */}
      <div className="mt-3.5 pt-3 border-t border-[#E3E7EC]">
        {debeCobrar ? (
          <div>
            <div className="font-poppins font-bold text-[22px] text-[#003A73] leading-tight">
              COBRAR {formatearPesos(parada.cobrar)}
            </div>
            {tienePagaCon && (
              <div className="font-inter text-[13.5px] text-[#5B6670] mt-0.5">
                Paga con {formatearPesos(parada.paga_con)} ·{' '}
                {cambio > 0 ? (
                  <span className="font-medium text-[#1F2933]">
                    lleva {formatearPesos(cambio)} de cambio
                  </span>
                ) : (
                  <span className="font-medium text-[#1F2933]">pago exacto</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="font-poppins font-bold text-[18px] text-[#1E7A44] leading-tight flex items-center gap-1.5">
            <Check className="w-5 h-5 text-[#1E7A44]" strokeWidth={2.5} />
            YA PAGÓ
          </div>
        )}
      </div>

      {/* Botones de contacto y mapa (Llamar y Cómo llegar) */}
      {(tieneTelefono || tieneCoordenadas) && (
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          {tieneTelefono ? (
            <a
              href={`tel:${parada.telefono}`}
              className="h-[48px] px-3 bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#005198] border border-[#005198] rounded-[5px] font-poppins font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              aria-label={`Llamar a ${parada.nombre} al ${parada.telefono}`}
            >
              <Phone className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span>Llamar</span>
            </a>
          ) : (
            <div />
          )}

          {urlComoLlegar ? (
            <a
              href={urlComoLlegar}
              target="_blank"
              rel="noopener noreferrer"
              className="h-[48px] px-3 bg-white hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#005198] border border-[#005198] rounded-[5px] font-poppins font-semibold text-[13.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              aria-label={`Cómo llegar a ${parada.direccion}`}
            >
              <Navigation className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span>Cómo llegar</span>
            </a>
          ) : (
            <div />
          )}
        </div>
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

            {/* Requisito 3: Foto de entrega con miniatura 56x56 px */}
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
                  {/* Miniatura 56x56 px */}
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
            {/* Botón principal naranja a todo el ancho: "Entregado" con texto en #1F2933 */}
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
                  <span>Entregado</span>
                </>
              )}
            </button>

            {/* Botón secundario: "No pude entregar" */}
            <button
              type="button"
              onClick={() => onAbrirModalNoEntregado(parada)}
              disabled={cargandoEstaParada}
              className="w-full h-[48px] bg-transparent hover:bg-[#F2F4F7] active:bg-[#E3E7EC] text-[#5B6670] hover:text-[#1F2933] border border-[#E3E7EC] rounded-[5px] font-poppins font-medium text-[14px] flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              No pude entregar
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
