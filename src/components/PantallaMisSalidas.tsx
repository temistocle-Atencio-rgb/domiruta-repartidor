import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RespuestaMisSalidas, SalidaResumen } from '../types.ts';
import { AvisosPush } from './AvisosPush.tsx';
import { avisarConSonido } from '../utils/aviso.ts';
import {
  misSalidas,
  confirmarDispositivo,
  cambiarDisponible,
  formatearPesos,
  formatearHoraEntrega,
} from '../supabase.ts';
import {
  obtenerCacheMisSalidas,
  guardarCacheMisSalidas,
} from '../utils/dispositivo.ts';
import { Download, AlertTriangle, RefreshCw, Share2, ShoppingBag } from 'lucide-react';
import { CheckCircle2, Package } from '../iconos/Icono';

interface PantallaMisSalidasProps {
  enlace: string;
  dispositivo: string;
  onAbrirSalida: (codigoSalida: string) => void;
}

export function PantallaMisSalidas({
  enlace,
  dispositivo,
  onAbrirSalida,
}: PantallaMisSalidasProps) {
  const [datos, setDatos] = useState<RespuestaMisSalidas | null>(() => {
    return obtenerCacheMisSalidas<RespuestaMisSalidas>();
  });
  const [cargando, setCargando] = useState<boolean>(!datos);
  const vistasRef = useRef<Set<string> | null>(null); // salidas nuevas que ya se avisaron (null = primera carga)
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [enlaceInvalido, setEnlaceInvalido] = useState<boolean>(false);
  const [otroDispositivo, setOtroDispositivo] = useState<boolean>(false);
  const [nombreRepartidor, setNombreRepartidor] = useState<string>('');
  const [confirmandoDispositivo, setConfirmandoDispositivo] = useState<boolean>(false);

  // Switch de disponibilidad
  const [disponible, setDisponible] = useState<boolean>(false);
  const [cambiandoDisponible, setCambiandoDisponible] = useState<boolean>(false);

  // Red y caché
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [usandoCache, setUsandoCache] = useState<boolean>(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // PWA Prompt de instalación
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [esStandalone, setEsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as any).standalone))
    );
  });
  const [esIos, setEsIos] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  });
  const [mostrarGuiaIos, setMostrarGuiaIos] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Detección de instalación y beforeinstallprompt
  // -------------------------------------------------------------
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstalarPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (esIos) {
      setMostrarGuiaIos((prev) => !prev);
    }
  };

  // -------------------------------------------------------------
  // Escuchar estado de conexión de red
  // -------------------------------------------------------------
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      cargarDatos(true);
    };
    const onOffline = () => {
      setIsOnline(false);
      setUsandoCache(true);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // -------------------------------------------------------------
  // Carga de salidas desde Supabase RPC
  // -------------------------------------------------------------
  const peticionEnCursoRef = useRef<boolean>(false);

  const cargarDatos = useCallback(
    async (silencioso: boolean = false) => {
      if (peticionEnCursoRef.current) return;
      peticionEnCursoRef.current = true;

      if (!silencioso && !datos) {
        setCargando(true);
      } else {
        setRefrescando(true);
      }

      try {
        const respuesta = await misSalidas(enlace, dispositivo);

        if (!respuesta) {
          // El enlace no existe o fue cancelado
          setEnlaceInvalido(true);
          setCargando(false);
          setRefrescando(false);
          peticionEnCursoRef.current = false;
          return;
        }

        setEnlaceInvalido(false);

        if (respuesta.otro_dispositivo) {
          setOtroDispositivo(true);
          setNombreRepartidor(respuesta.nombre || '');
          setCargando(false);
          setRefrescando(false);
          peticionEnCursoRef.current = false;
          return;
        }

        // Datos válidos en este dispositivo
        setOtroDispositivo(false);
        setNombreRepartidor(respuesta.nombre || '');
        setDisponible(Boolean(respuesta.disponible));
        // salida nueva que antes no estaba: tono y vibración
        const nuevas = (respuesta.salidas || [])
          .filter((x) => x.estado === 'asignada')
          .map((x) => x.codigo);
        if (vistasRef.current !== null && nuevas.some((c) => !vistasRef.current!.has(c))) {
          avisarConSonido();
        }
        vistasRef.current = new Set([...(vistasRef.current ?? []), ...nuevas]);
        setDatos(respuesta);
        guardarCacheMisSalidas(respuesta);
        setUsandoCache(false);
        setErrorMensaje(null);
      } catch (err) {
        console.warn('Error al cargar mis salidas:', err);
        // Si falla la red, intentar usar la caché guardada
        const cache = obtenerCacheMisSalidas<RespuestaMisSalidas>();
        if (cache) {
          setDatos(cache);
          setNombreRepartidor(cache.nombre || '');
          setDisponible(Boolean(cache.disponible));
          setUsandoCache(true);
        } else {
          setErrorMensaje('No se pudieron cargar las salidas. Revisa el internet.');
        }
      } finally {
        setCargando(false);
        setRefrescando(false);
        peticionEnCursoRef.current = false;
      }
    },
    [enlace, dispositivo, datos]
  );

  // Carga inicial
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Actualización automática cada 20 segundos y al enfocar pestaña
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible' && !otroDispositivo && !enlaceInvalido) {
        cargarDatos(true);
      }
    }, 20000);

    const handleVisibilidad = () => {
      if (document.visibilityState === 'visible' && !otroDispositivo && !enlaceInvalido) {
        cargarDatos(true);
      }
    };

    const handleFocus = () => {
      if (!otroDispositivo && !enlaceInvalido) {
        cargarDatos(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilidad);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', handleVisibilidad);
      window.removeEventListener('focus', handleFocus);
    };
  }, [cargarDatos, otroDispositivo, enlaceInvalido]);

  // -------------------------------------------------------------
  // Confirmar cambio a este celular
  // -------------------------------------------------------------
  const handleConfirmarDispositivo = async () => {
    setConfirmandoDispositivo(true);
    setErrorMensaje(null);
    try {
      const exito = await confirmarDispositivo(enlace, dispositivo);
      if (exito) {
        setOtroDispositivo(false);
        await cargarDatos(false);
      } else {
        setErrorMensaje('No se pudo activar este celular. Revisa el internet e intenta otra vez.');
      }
    } catch {
      setErrorMensaje('Error de conexión al activar este celular.');
    } finally {
      setConfirmandoDispositivo(false);
    }
  };

  // -------------------------------------------------------------
  // Cambiar switch de disponibilidad
  // -------------------------------------------------------------
  const handleAlternarDisponible = async () => {
    if (cambiandoDisponible) return;
    const nuevoValor = !disponible;

    // Actualización optimista
    setDisponible(nuevoValor);
    setCambiandoDisponible(true);
    setErrorMensaje(null);

    try {
      const ok = await cambiarDisponible(enlace, dispositivo, nuevoValor);
      if (!ok) {
        // Revertir si falló
        setDisponible(!nuevoValor);
        setErrorMensaje('No se pudo cambiar la disponibilidad. Revisa el internet.');
      }
    } catch {
      setDisponible(!nuevoValor);
      setErrorMensaje('Error de conexión al cambiar disponibilidad.');
    } finally {
      setCambiandoDisponible(false);
    }
  };

  // -------------------------------------------------------------
  // Clasificación de las salidas
  // -------------------------------------------------------------
  const salidas = datos?.salidas || [];

  // 1. Salida nueva (asignada, pendiente de aceptar)
  const salidaNueva = salidas.find(
    (s) =>
      s.estado === 'asignada' ||
      s.estado === 'nueva' ||
      (s.aceptada === false && s.rechazada !== true && s.estado !== 'terminada')
  );

  // 2. En curso (aceptadas y no terminadas, que no sean la salida nueva)
  const salidasEnCurso = salidas.filter((s) => {
    if (salidaNueva && s.codigo === salidaNueva.codigo) return false;
    if (s.estado === 'terminada') return false;
    return s.estado === 'en_curso' || s.aceptada === true;
  });

  // 3. Hoy (terminadas)
  const salidasHoy = salidas.filter((s) => s.estado === 'terminada');

  // =============================================================
  // VISTA: Enlace no válido
  // =============================================================
  if (enlaceInvalido) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#B03030]/10 text-[#B03030] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-[#B03030]" strokeWidth={2} />
          </div>
          <h1 className="font-poppins font-bold text-[19px] text-[#003A73] leading-tight m-0">
            Enlace no válido
          </h1>
          <p className="font-inter text-[14.5px] text-[#5B6670] leading-relaxed m-0">
            Este enlace ya no es válido. Pídele uno nuevo a la tienda.
          </p>
        </div>
      </main>
    );
  }

  // =============================================================
  // VISTA: Enlace en otro celular
  // =============================================================
  if (otroDispositivo) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-4">
          {/* Logo DomiRuta */}
          <div className="flex justify-center">
            <svg viewBox="0 0 260 300" className="w-12 h-14" aria-hidden="true">
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
          </div>

          <div>
            <h1 className="font-poppins font-bold text-[19px] text-[#003A73] leading-tight m-0">
              Este enlace está en otro celular
            </h1>
            <p className="font-inter text-[14px] text-[#5B6670] mt-2 mb-0 leading-relaxed">
              {nombreRepartidor ? `Hola ${nombreRepartidor}. ` : ''}
              Tu cuenta de repartidor solo puede usarse en un celular a la vez. ¿Quieres usarla en este dispositivo?
            </p>
          </div>

          {errorMensaje && (
            <div className="bg-[#B03030]/10 border border-[#B03030]/30 rounded-[5px] p-2.5 text-[#B03030] text-xs font-inter text-center">
              {errorMensaje}
            </div>
          )}

          {/* Único botón naranja de la pantalla */}
          <button
            type="button"
            onClick={handleConfirmarDispositivo}
            disabled={confirmandoDispositivo}
            className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07d10] active:scale-[0.99] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[15px] shadow-sm flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
          >
            {confirmandoDispositivo ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              'Usar este celular'
            )}
          </button>
        </div>
      </main>
    );
  }

  // =============================================================
  // VISTA PRINCIPAL: Mis salidas
  // =============================================================
  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col pb-16">
      {/* --------------------------------------------------------- */}
      {/* Barra superior en azul profundo #003A73 */}
      {/* --------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-[#003A73] text-white shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-2 min-h-[56px]">
          {/* Logo y saludo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <svg viewBox="0 0 260 300" className="w-6 h-7 flex-shrink-0" aria-hidden="true">
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
            <div className="min-w-0">
              <span className="block text-[11px] font-poppins font-semibold uppercase tracking-wider text-white/70 leading-none">
                DomiRuta
              </span>
              <h1 className="font-poppins font-bold text-[16px] text-white truncate leading-tight mt-0.5 m-0">
                {nombreRepartidor ? `Hola, ${nombreRepartidor}` : 'Mis salidas'}
              </h1>
            </div>
          </div>

          {/* Botones de acción en cabecera */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Botón Instalar app si está disponible */}
            {!esStandalone && (deferredPrompt || esIos) && (
              <button
                type="button"
                onClick={handleInstalarPwa}
                title="Instalar DomiRuta"
                className="h-[36px] px-2.5 rounded-[5px] border border-white/30 hover:bg-white/10 text-white font-poppins text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {esIos ? (
                  <Share2 className="w-3.5 h-3.5 text-white/90" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-white/90" />
                )}
                <span>Instalar app</span>
              </button>
            )}

            {/* Botón recargar */}
            <button
              type="button"
              onClick={() => cargarDatos(false)}
              disabled={refrescando || cargando}
              title="Actualizar salidas"
              aria-label="Actualizar salidas"
              className="w-[40px] h-[40px] flex items-center justify-center rounded-[5px] text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refrescando ? 'animate-spin' : ''}`}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* Notificación de cómo instalar en iPhone si se pulsa */}
        {mostrarGuiaIos && !esStandalone && (
          <div className="bg-[#005198] text-white px-4 py-2.5 text-xs font-inter border-t border-white/20 flex items-start justify-between gap-2">
            <span>
              En iPhone: toca el botón <strong>Compartir</strong> (abajo en Safari) y luego{' '}
              <strong>«Agregar a inicio»</strong>.
            </span>
            <button
              type="button"
              onClick={() => setMostrarGuiaIos(false)}
              className="text-white/80 font-bold hover:text-white px-1 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Franja roja de aviso sin internet o usando datos guardados */}
        {(!isOnline || usandoCache) && (
          <div
            role="alert"
            className="bg-[#B03030] text-white py-1.5 px-4 text-center text-xs font-poppins font-medium shadow-sm"
          >
            Sin internet: mostramos lo último
          </div>
        )}
      </header>

      {/* --------------------------------------------------------- */}
      {/* Contenido principal */}
      {/* --------------------------------------------------------- */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        {/* Banner de error general si ocurre */}
        {errorMensaje && (
          <aside
            role="alert"
            className="bg-white border-l-4 border-[#B03030] rounded-[5px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3 text-[#B03030] text-[13px] font-inter leading-snug flex items-center justify-between gap-2"
          >
            <span>{errorMensaje}</span>
            <button
              type="button"
              onClick={() => setErrorMensaje(null)}
              className="text-[#5B6670] hover:text-[#1F2933] font-bold px-1"
            >
              ✕
            </button>
          </aside>
        )}

        {/* ------------------------------------------------------- */}
        {/* Interruptor: Disponible para salidas */}
        {/* ------------------------------------------------------- */}
        <section
          aria-labelledby="disponibilidad-titulo"
          className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 pr-1">
              <h2
                id="disponibilidad-titulo"
                className="font-poppins font-semibold text-[16px] text-[#1F2933] m-0"
              >
                Disponible para salidas
              </h2>
              <p
                className={`font-inter text-[13px] mt-1 mb-0 leading-tight ${
                  disponible ? 'text-[#1E7A44] font-medium' : 'text-[#5B6670]'
                }`}
              >
                {disponible
                  ? 'La tienda puede asignarte salidas'
                  : 'No recibirás nuevas salidas'}
              </p>
            </div>

            {/* Switch con zona táctil de 48px */}
            <button
              type="button"
              role="switch"
              aria-checked={disponible}
              aria-label="Disponible para salidas"
              onClick={handleAlternarDisponible}
              disabled={cambiandoDisponible}
              className="w-[54px] h-[48px] flex items-center justify-center p-0 bg-transparent cursor-pointer select-none flex-shrink-0"
            >
              <div
                className={`w-[50px] h-[28px] rounded-full transition-colors relative flex items-center px-1 ${
                  disponible ? 'bg-[#1E7A44]' : 'bg-[#E3E7EC]'
                }`}
              >
                <div
                  className={`w-[22px] h-[22px] rounded-full bg-white shadow-md transform transition-transform ${
                    disponible ? 'translate-x-[22px]' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        <AvisosPush enlace={enlace} dispositivo={dispositivo} esIos={esIos} esStandalone={esStandalone} />

        {/* 1. SECCIÓN: Salida nueva (si hay una recién asignada) */}
        {/* ------------------------------------------------------- */}
        {salidaNueva && (
          <section aria-labelledby="salida-nueva-titulo" className="space-y-2">
            <div className="flex items-center gap-1.5 px-1">
              <span className="w-2 h-2 rounded-full bg-[#005198] animate-pulse" />
              <h2
                id="salida-nueva-titulo"
                className="font-poppins font-bold text-[15px] text-[#003A73] uppercase tracking-wide m-0"
              >
                Salida nueva asignada
              </h2>
            </div>

            <article className="bg-white rounded-[5px] border-2 border-[#005198] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 space-y-3.5">
              <div className="flex flex-col gap-1">
                <div className="min-w-0">
                  <span className="font-inter text-xs text-[#5B6670]">Tienda</span>
                  <h3 className="font-poppins font-bold text-[18px] text-[#003A73] leading-snug m-0 truncate">
                    {salidaNueva.tienda || 'Tu tienda'}
                  </h3>
                </div>
                {salidaNueva.hora && (
                  <span className="font-inter text-xs text-[#5B6670] flex-shrink-0 mt-0.5">
                    {salidaNueva.hora}
                  </span>
                )}
              </div>

              {/* Métricas clave */}
              <div className="pt-1 border-t border-[#E3E7EC]">
                <div>
                  <span className="block font-inter text-xs text-[#5B6670]">Entregas</span>
                  <span className="font-poppins font-bold text-[16px] text-[#1F2933]">
                    {salidaNueva.entregas_total ?? salidaNueva.entregas_restantes ?? 1}
                  </span>
                </div>

              </div>

              {/* ÚNICO BOTÓN NARANJA DE LA PANTALLA */}
              <button
                type="button"
                onClick={() => onAbrirSalida(salidaNueva.codigo)}
                className="w-full h-[48px] bg-[#F28C1B] hover:bg-[#e07d10] active:scale-[0.99] text-[#1F2933] rounded-[5px] font-poppins font-semibold text-[15px] shadow-sm flex items-center justify-center transition-all cursor-pointer select-none"
              >
                Ver salida
              </button>
            </article>
          </section>
        )}

        {/* ------------------------------------------------------- */}
        {/* 2. SECCIÓN: En curso */}
        {/* ------------------------------------------------------- */}
        <section aria-labelledby="en-curso-titulo" className="space-y-2">
          <h2
            id="en-curso-titulo"
            className="font-poppins font-semibold text-[15px] text-[#003A73] px-1 m-0"
          >
            En curso
          </h2>

          {salidasEnCurso.length === 0 ? (
            <div className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 text-center">
              <p className="font-inter text-[14px] text-[#5B6670] m-0">
                No tienes salidas en curso en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {salidasEnCurso.map((salida) => {
                const restantes =
                  salida.entregas_restantes ??
                  (salida.entregas_total !== undefined && salida.entregadas !== undefined
                    ? Math.max(0, salida.entregas_total - salida.entregadas)
                    : 0);

                return (
                  <article
                    key={salida.codigo}
                    className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-inter text-xs text-[#5B6670]">Tienda</span>
                        <h3 className="font-poppins font-bold text-[17px] text-[#003A73] leading-snug m-0 truncate">
                          {salida.tienda || 'Salida activa'}
                        </h3>
                      </div>
                      
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm border-t border-[#E3E7EC] pt-2">
                      <div>
                        <span className="block font-inter text-xs text-[#5B6670]">Entregas pendientes</span>
                        <strong className="font-poppins font-bold text-[15px] text-[#1F2933]">
                          {restantes} de {salida.entregas_total ?? restantes}
                        </strong>
                      </div>
                      <div>
                        <span className="block font-inter text-xs text-[#5B6670]">Estado</span>
                        <strong className="font-poppins font-bold text-[15px] text-[#003A73]">
                          {salida.regresando ? 'Regresando a la tienda' : 'En ruta'}
                        </strong>
                      </div>
                    </div>

                    {/* Botón secundario azul / borde, NO naranja */}
                    <button
                      type="button"
                      onClick={() => onAbrirSalida(salida.codigo)}
                      className="w-full h-[48px] bg-white border border-[#005198] hover:bg-[#005198]/5 active:bg-[#005198]/10 text-[#005198] rounded-[5px] font-poppins font-semibold text-[15px] flex items-center justify-center transition-colors cursor-pointer select-none"
                    >
                      Abrir
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- */}
        {/* 3. SECCIÓN: Hoy */}
        {/* ------------------------------------------------------- */}
        <section aria-labelledby="hoy-titulo" className="space-y-2 pt-1">
          <h2
            id="hoy-titulo"
            className="font-poppins font-semibold text-[15px] text-[#003A73] px-1 m-0"
          >
            Hoy
          </h2>

          {salidasHoy.length === 0 ? (
            <div className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 text-center">
              <p className="font-inter text-[14px] text-[#5B6670] m-0">
                No tienes salidas anteriores hoy.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {salidasHoy.map((salida, idx) => (
                <article
                  key={salida.codigo || idx}
                  className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-poppins font-semibold text-[15px] text-[#1F2933] m-0 truncate">
                      {salida.tienda || 'Salida finalizada'}
                    </h3>
                    <span className="font-inter text-xs text-[#5B6670] flex-shrink-0">
                      {salida.hora || (salida.terminada_en ? formatearHoraEntrega(salida.terminada_en) : '')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-inter text-[13.5px] text-[#5B6670] pt-1 border-t border-[#E3E7EC]/60">
                    <div>
                      <span className={salida.resultado === 'Terminada' ? 'text-[#1E7A44] font-medium' : 'text-[#5B6670]'}>
                        {salida.resultado === 'Terminada'
                          ? `${salida.entregadas || 0} entregadas`
                          : `${salida.entregas_total || 0} ${salida.entregas_total === 1 ? 'entrega' : 'entregas'}`}
                      </span>
                      {Boolean(salida.no_entregadas) && (
                        <span className="text-[#B03030] ml-2">
                          · {salida.no_entregadas} no entregadas
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-poppins font-semibold ${salida.resultado === 'Terminada' ? 'text-[#1E7A44]' : 'text-[#5B6670]'}`}>
                        {salida.resultado}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
