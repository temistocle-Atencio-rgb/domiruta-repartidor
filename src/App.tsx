import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Parada, Mensaje } from './types.ts';
import {
  verSalida,
  marcarEntrega,
  verMensajes,
  enviarMensaje,
  enviarUbicacion,
  isSupabaseConfigured,
  formatearPesos,
} from './supabase.ts';
import { Header } from './components/Header.tsx';
import { TarjetaParada } from './components/TarjetaParada.tsx';
import { ModalMotivo } from './components/ModalMotivo.tsx';
import { ResumenFijo } from './components/ResumenFijo.tsx';
import { AvisoError } from './components/AvisoError.tsx';
import { HojaMensajes } from './components/HojaMensajes.tsx';
import { AlertTriangle, RefreshCw, MessageSquare, MapPin, X } from 'lucide-react';

function vibrarCelular(ms = 200) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignorar restricciones de dispositivo o navegador
    }
  }
}

function safeGetStorage(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Continuar sin error si el navegador tiene almacenamiento deshabilitado
  }
}

export default function App() {
  // 1. Obtener código de la salida del parámetro ?s=
  const [codigo] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const paramS = params.get('s');
    return paramS && paramS.trim().length > 0 ? paramS.trim() : null;
  });

  const [paradas, setParadas] = useState<Parada[]>([]);
  const paradasRef = useRef<Parada[]>([]);
  paradasRef.current = paradas;

  const [cargandoInicial, setCargandoInicial] = useState<boolean>(true);
  const [recargandoSegundoPlano, setRecargandoSegundoPlano] = useState<boolean>(false);
  const [salidaCerradaOVacia, setSalidaCerradaOVacia] = useState<boolean>(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Estados de interacción por parada
  const [paradaCargandoId, setParadaCargandoId] = useState<string | number | null>(null);
  const [mensajeErrorAccion, setMensajeErrorAccion] = useState<string | null>(null);

  // Modal para "No pude entregar"
  const [paradaParaMotivo, setParadaParaMotivo] = useState<Parada | null>(null);
  const [guardandoMotivo, setGuardandoMotivo] = useState<boolean>(false);

  // Requisito 5: Paradas nuevas resaltadas por 10 segundos
  const [paradasNuevasIds, setParadasNuevasIds] = useState<(string | number)[]>([]);
  const [avisoParadaNueva, setAvisoParadaNueva] = useState<string | null>(null);

  // Requisito 2: Mensajes con la tienda
  const [hojaMensajesAbierta, setHojaMensajesAbierta] = useState<boolean>(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [mensajesNuevosNoLeidos, setMensajesNuevosNoLeidos] = useState<number>(0);
  const [avisoMensajeTienda, setAvisoMensajeTienda] = useState<string | null>(null);
  const ultimoIdMensajeRef = useRef<number>(0);

  // Requisito 4: Compartir ubicación
  const [mostrarAvisoUbicacion, setMostrarAvisoUbicacion] = useState<boolean>(() => {
    return safeGetStorage('domiruta_permiso_ubicacion_decidido') !== 'true';
  });
  const [ubicacionActiva, setUbicacionActiva] = useState<boolean>(() => {
    return safeGetStorage('domiruta_ubicacion_activa') === 'true';
  });
  const ultimaPosicionRef = useRef<{ lat: number; lon: number } | null>(null);
  const primeraLecturaEnviadaRef = useRef<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  // --------------------------------------------------------------------------
  // Carga de paradas (ver_salida)
  // --------------------------------------------------------------------------
  const cargarParadas = useCallback(
    async (mostrarLoaderCompleto = false) => {
      if (!isSupabaseConfigured() || !codigo) {
        setCargandoInicial(false);
        return;
      }

      if (mostrarLoaderCompleto) {
        setCargandoInicial(true);
      } else {
        setRecargandoSegundoPlano(true);
      }

      setErrorCarga(null);

      try {
        const resultado = await verSalida(codigo);
        const ordenadas = [...resultado].sort((a, b) => a.orden - b.orden);

        // Requisito 5: Detectar si en una recarga aparece una parada que antes no estaba
        const anteriores = paradasRef.current;
        if (anteriores.length > 0 && ordenadas.length > 0) {
          const idsAnteriores = new Set(anteriores.map((p) => String(p.id)));
          const nuevas = ordenadas.filter((p) => !idsAnteriores.has(String(p.id)));

          if (nuevas.length > 0) {
            const nombres = nuevas.map((n) => n.nombre).join(', ');
            setAvisoParadaNueva(`La tienda agregó una entrega: ${nombres}`);
            vibrarCelular(200);

            const nuevosIds = nuevas.map((n) => n.id);
            setParadasNuevasIds((prev) => [...prev, ...nuevosIds]);

            setTimeout(() => {
              setParadasNuevasIds((prev) =>
                prev.filter((id) => !nuevosIds.some((nid) => String(nid) === String(id)))
              );
            }, 10000);

            setTimeout(() => {
              setAvisoParadaNueva(null);
            }, 10000);
          }
        }

        setParadas(ordenadas);
        setSalidaCerradaOVacia(ordenadas.length === 0);
      } catch (err) {
        console.error('Error al consultar ver_salida:', err);
        setErrorCarga('No se pudo cargar la salida. Revisa el internet.');
      } finally {
        setCargandoInicial(false);
        setRecargandoSegundoPlano(false);
      }
    },
    [codigo]
  );

  // Carga inicial
  useEffect(() => {
    cargarParadas(true);
  }, [cargarParadas]);

  // Recarga automática cada 30 segundos y al volver a la pestaña
  useEffect(() => {
    if (!codigo) return;

    const intervalo = setInterval(() => {
      cargarParadas(false);
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cargarParadas(false);
      }
    };

    const handleFocus = () => {
      cargarParadas(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [codigo, cargarParadas]);

  // --------------------------------------------------------------------------
  // Requisito 2: Polling de mensajes cada 10 segundos
  // --------------------------------------------------------------------------
  const consultarMensajes = useCallback(async () => {
    if (!codigo || !isSupabaseConfigured()) return;

    try {
      const nuevos = await verMensajes(codigo, ultimoIdMensajeRef.current);
      if (nuevos && nuevos.length > 0) {
        setMensajes((prev) => {
          const existentesIds = new Set(prev.map((m) => m.id));
          const soloNuevos = nuevos.filter((m) => !existentesIds.has(m.id));
          if (soloNuevos.length === 0) return prev;

          // Actualizar el ID más alto
          const maxId = Math.max(...soloNuevos.map((m) => m.id));
          if (maxId > ultimoIdMensajeRef.current) {
            ultimoIdMensajeRef.current = maxId;
          }

          // Si hay mensajes de la tienda y la hoja está cerrada, alertar al repartidor
          const deTienda = soloNuevos.filter((m) => m.de === 'tienda');
          if (deTienda.length > 0 && !hojaMensajesAbierta) {
            const ultimoDeTienda = deTienda[deTienda.length - 1];
            setAvisoMensajeTienda(`Tienda: ${ultimoDeTienda.texto}`);
            vibrarCelular(200);
            setMensajesNuevosNoLeidos((n) => n + deTienda.length);

            setTimeout(() => {
              setAvisoMensajeTienda(null);
            }, 5000);
          }

          return [...prev, ...soloNuevos];
        });
      }
    } catch (err) {
      console.error('Error al consultar mensajes:', err);
    }
  }, [codigo, hojaMensajesAbierta]);

  useEffect(() => {
    if (!codigo) return;

    consultarMensajes();
    const intervaloMensajes = setInterval(consultarMensajes, 10000);

    return () => clearInterval(intervaloMensajes);
  }, [codigo, consultarMensajes]);

  // Limpiar indicador de mensajes no leídos al abrir la hoja
  const handleAbrirMensajes = () => {
    setHojaMensajesAbierta(true);
    setMensajesNuevosNoLeidos(0);
    setAvisoMensajeTienda(null);
  };

  const handleEnviarMensaje = async (texto: string): Promise<boolean> => {
    if (!codigo) return false;
    const exito = await enviarMensaje(codigo, texto);
    if (exito) {
      // Consultar de inmediato para ver el mensaje nuevo en pantalla
      consultarMensajes();
      return true;
    }
    return false;
  };

  // --------------------------------------------------------------------------
  // Requisito 4: Compartir ubicación con navigator.geolocation.watchPosition
  // --------------------------------------------------------------------------
  const paradasEnCamino = useMemo(
    () => paradas.filter((p) => p.estado === 'en_camino'),
    [paradas]
  );
  const quedanEnCamino = paradasEnCamino.length > 0;

  // Activar geolocalización cuando está encendida y quedan paradas en camino
  useEffect(() => {
    if (!ubicacionActiva || !quedanEnCamino || !codigo) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      primeraLecturaEnviadaRef.current = false;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUbicacionActiva(false);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nuevaPos = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        ultimaPosicionRef.current = nuevaPos;

        // Enviar la posición apenas llegue la primera lectura de watchPosition
        if (!primeraLecturaEnviadaRef.current && codigo) {
          primeraLecturaEnviadaRef.current = true;
          enviarUbicacion(codigo, nuevaPos.lat, nuevaPos.lon);
        }
      },
      (err) => {
        console.warn('Geolocalización rechazada o no disponible:', err);
        // Si el permiso se niega, no insistir y apagar
        setUbicacionActiva(false);
        safeSetStorage('domiruta_ubicacion_activa', 'false');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [ubicacionActiva, quedanEnCamino, codigo]);

  // Enviar ubicación cada 30 segundos si está activa
  useEffect(() => {
    if (!ubicacionActiva || !quedanEnCamino || !codigo) return;

    const intervaloUbicacion = setInterval(() => {
      if (ultimaPosicionRef.current) {
        enviarUbicacion(
          codigo,
          ultimaPosicionRef.current.lat,
          ultimaPosicionRef.current.lon
        );
      }
    }, 30000);

    return () => clearInterval(intervaloUbicacion);
  }, [ubicacionActiva, quedanEnCamino, codigo]);

  const handleAceptarUbicacion = () => {
    setMostrarAvisoUbicacion(false);
    setUbicacionActiva(true);
    safeSetStorage('domiruta_permiso_ubicacion_decidido', 'true');
    safeSetStorage('domiruta_ubicacion_activa', 'true');
  };

  const handleRechazarUbicacion = () => {
    setMostrarAvisoUbicacion(false);
    setUbicacionActiva(false);
    safeSetStorage('domiruta_permiso_ubicacion_decidido', 'true');
    safeSetStorage('domiruta_ubicacion_activa', 'false');
  };

  const handleAlternarUbicacion = () => {
    const nuevoEstado = !ubicacionActiva;
    setUbicacionActiva(nuevoEstado);
    safeSetStorage('domiruta_ubicacion_activa', String(nuevoEstado));
  };

  // --------------------------------------------------------------------------
  // Acciones de entrega
  // --------------------------------------------------------------------------
  const handleMarcarEntregado = async (parada: Parada) => {
    if (paradaCargandoId !== null) return;
    setParadaCargandoId(parada.id);
    setMensajeErrorAccion(null);

    const guardadoExitoso = await marcarEntrega(codigo!, parada.id, 'entregado', null);

    if (guardadoExitoso) {
      setParadas((prev) =>
        prev.map((p) => (p.id === parada.id ? { ...p, estado: 'entregado', motivo: null } : p))
      );
    } else {
      setMensajeErrorAccion('No se pudo guardar. Revisa el internet y toca otra vez');
    }

    setParadaCargandoId(null);
  };

  const handleDeshacer = async (parada: Parada) => {
    if (paradaCargandoId !== null) return;
    setParadaCargandoId(parada.id);
    setMensajeErrorAccion(null);

    const guardadoExitoso = await marcarEntrega(codigo!, parada.id, 'en_camino', null);

    if (guardadoExitoso) {
      setParadas((prev) =>
        prev.map((p) => (p.id === parada.id ? { ...p, estado: 'en_camino', motivo: null } : p))
      );
    } else {
      setMensajeErrorAccion('No se pudo guardar. Revisa el internet y toca otra vez');
    }

    setParadaCargandoId(null);
  };

  const handleConfirmarMotivo = async (motivo: string) => {
    if (!paradaParaMotivo || guardandoMotivo) return;
    const paradaId = paradaParaMotivo.id;
    setGuardandoMotivo(true);
    setMensajeErrorAccion(null);

    const guardadoExitoso = await marcarEntrega(codigo!, paradaId, 'no_entregado', motivo);

    if (guardadoExitoso) {
      setParadas((prev) =>
        prev.map((p) => (p.id === paradaId ? { ...p, estado: 'no_entregado', motivo } : p))
      );
      setParadaParaMotivo(null);
    } else {
      setMensajeErrorAccion('No se pudo guardar. Revisa el internet y toca otra vez');
    }

    setGuardandoMotivo(false);
  };

  const handleFotoSubidaExito = (paradaId: string | number) => {
    setParadas((prev) =>
      prev.map((p) => (p.id === paradaId ? { ...p, tiene_foto: true } : p))
    );
  };

  // Cálculos de resumen
  const totalParadas = paradas.length;
  const paradasEntregadas = useMemo(
    () => paradas.filter((p) => p.estado === 'entregado').length,
    [paradas]
  );
  const plataATraer = useMemo(() => {
    return paradas
      .filter((p) => p.estado === 'entregado')
      .reduce((acumulado, p) => acumulado + (p.cobrar || 0), 0);
  }, [paradas]);

  // Requisito 3: "Regresando" automático
  const todasTerminadas = totalParadas > 0 && paradasEnCamino.length === 0;

  // ========================================================
  // CASO 0: Supabase no está configurado
  // ========================================================
  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center">
          <p className="font-inter text-[15px] text-[#1F2933] leading-relaxed m-0 font-medium">
            La página no está configurada. Avísale a la tienda.
          </p>
        </div>
      </main>
    );
  }

  // ========================================================
  // CASO 1: No hay código en el parámetro `s`
  // ========================================================
  if (!codigo) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center">
          <p className="font-inter text-[15px] text-[#1F2933] leading-relaxed m-0 font-medium">
            Este enlace no es válido. Pídele a la tienda que te lo envíe otra vez.
          </p>
        </div>
      </main>
    );
  }

  // ========================================================
  // CASO 2: La salida viene vacía
  // ========================================================
  if (!cargandoInicial && salidaCerradaOVacia) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex flex-col">
        <Header
          entregadas={0}
          total={0}
          cargando={recargandoSegundoPlano}
          onRecargar={() => cargarParadas(false)}
          codigo={codigo}
          mensajesNuevos={mensajesNuevosNoLeidos}
          onAbrirMensajes={handleAbrirMensajes}
          ubicacionActiva={false}
          onAlternarUbicacion={() => {}}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center">
            <div className="w-12 h-12 rounded-[5px] bg-[#005198]/10 text-[#005198] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-[#005198]" strokeWidth={2} />
            </div>
            <h2 className="font-poppins font-bold text-[18px] text-[#003A73] mb-2 leading-snug">
              Sin entregas activas
            </h2>
            <p className="font-inter text-[15px] text-[#1F2933] leading-relaxed mb-5 font-medium">
              Esta salida ya se cerró o el enlace no es válido.
            </p>
            <button
              type="button"
              onClick={() => cargarParadas(true)}
              className="w-full h-[48px] bg-[#005198] hover:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2} />
              <span>Verificar de nuevo</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ========================================================
  // CASO 3: Pantalla principal de paradas
  // ========================================================
  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col pb-24">
      {/* Barra superior azul profundo */}
      <Header
        entregadas={paradasEntregadas}
        total={totalParadas}
        cargando={recargandoSegundoPlano || cargandoInicial}
        onRecargar={() => cargarParadas(false)}
        codigo={codigo}
        mensajesNuevos={mensajesNuevosNoLeidos}
        onAbrirMensajes={handleAbrirMensajes}
        ubicacionActiva={ubicacionActiva && quedanEnCamino}
        onAlternarUbicacion={handleAlternarUbicacion}
      />

      {/* Requisito 2: Aviso emergente arriba cuando llega mensaje de la tienda con la hoja cerrada */}
      {avisoMensajeTienda && !hojaMensajesAbierta && (
        <aside
          role="status"
          aria-live="polite"
          onClick={handleAbrirMensajes}
          className="fixed top-20 left-4 right-4 z-40 max-w-md mx-auto bg-white border-l-4 border-[#005198] rounded-[5px] shadow-[0_4px_14px_rgba(0,0,0,0.18)] p-3.5 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 cursor-pointer"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <MessageSquare className="w-5 h-5 text-[#005198] flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="min-w-0">
              <span className="font-poppins font-bold text-xs uppercase tracking-wide text-[#003A73] block mb-0.5">
                Mensaje de la tienda
              </span>
              <p className="font-inter text-[14px] font-medium text-[#1F2933] leading-snug m-0 break-words line-clamp-2">
                {avisoMensajeTienda}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAvisoMensajeTienda(null);
            }}
            className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center rounded-[5px] text-[#5B6670] hover:text-[#1F2933] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </aside>
      )}

      {/* Requisito 5: Aviso emergente cuando la tienda agrega una entrega nueva */}
      {avisoParadaNueva && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-20 left-4 right-4 z-40 max-w-md mx-auto bg-white border-l-4 border-[#005198] rounded-[5px] shadow-[0_4px_14px_rgba(0,0,0,0.18)] p-3.5 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 text-[#005198] flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="font-inter text-[14px] font-semibold text-[#003A73] leading-snug m-0">
              {avisoParadaNueva}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAvisoParadaNueva(null)}
            className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center rounded-[5px] text-[#5B6670] hover:text-[#1F2933] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </aside>
      )}

      {/* Banner de error general (guardar o subir foto) */}
      <AvisoError
        mensaje={mensajeErrorAccion}
        onCerrar={() => setMensajeErrorAccion(null)}
      />

      {/* Contenedor central optimizado para celulares de 360px en adelante */}
      <main className="flex-1 max-w-md mx-auto w-full px-3.5 pt-3.5 space-y-3.5">
        {/* Requisito 4: Aviso inicial para compartir ubicación */}
        {mostrarAvisoUbicacion && (
          <section
            aria-label="Permiso de ubicación"
            className="bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5 space-y-3 animate-in fade-in duration-150"
          >
            <div className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-[#005198] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="font-inter text-[13.5px] text-[#1F2933] leading-snug m-0 font-medium">
                Para que la tienda vea por dónde vas, comparte tu ubicación mientras haces la ruta.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAceptarUbicacion}
                className="flex-1 h-[44px] bg-[#005198] hover:bg-[#003A73] active:bg-[#003A73] text-white rounded-[5px] font-poppins font-semibold text-[13px] flex items-center justify-center transition-colors cursor-pointer"
              >
                Compartir ubicación
              </button>
              <button
                type="button"
                onClick={handleRechazarUbicacion}
                className="px-3 h-[44px] text-[#5B6670] hover:text-[#1F2933] rounded-[5px] font-poppins font-medium text-[13px] flex items-center justify-center transition-colors cursor-pointer"
              >
                Ahora no
              </button>
            </div>
          </section>
        )}

        {/* Requisito 3: "Regresando" automático cuando no queda ninguna parada en camino */}
        {todasTerminadas && (
          <div className="py-2.5 px-3 text-center animate-in fade-in duration-200">
            <p className="font-poppins font-bold text-[18px] text-[#1E7A44] leading-snug m-0">
              Terminaste. Regresa a la tienda con {formatearPesos(plataATraer)}
            </p>
          </div>
        )}

        {errorCarga && (
          <div className="bg-white border-l-4 border-[#B03030] p-3 rounded-[5px] text-[13.5px] font-inter text-[#B03030] shadow-sm flex items-center justify-between">
            <span>{errorCarga}</span>
            <button
              onClick={() => cargarParadas(false)}
              className="text-[#005198] font-poppins font-semibold text-xs underline cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {cargandoInicial ? (
          <div className="space-y-3 pt-1">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[5px] border border-[#E3E7EC] p-4 animate-pulse space-y-3"
              >
                <div className="flex gap-3">
                  <div className="w-11 h-11 bg-[#E3E7EC] rounded-[5px]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#E3E7EC] rounded w-3/4" />
                    <div className="h-3 bg-[#E3E7EC] rounded w-full" />
                  </div>
                </div>
                <div className="h-6 bg-[#E3E7EC] rounded w-1/2 pt-2" />
                <div className="h-12 bg-[#E3E7EC] rounded-[5px]" />
              </div>
            ))}
          </div>
        ) : (
          /* Lista de paradas en el orden de `orden` */
          paradas.map((parada) => {
            const esNueva = paradasNuevasIds.some((id) => String(id) === String(parada.id));
            return (
              <TarjetaParada
                key={parada.id}
                parada={parada}
                codigo={codigo}
                esNueva={esNueva}
                cargandoEstaParada={paradaCargandoId === parada.id}
                onMarcarEntregado={handleMarcarEntregado}
                onAbrirModalNoEntregado={(p) => setParadaParaMotivo(p)}
                onDeshacer={handleDeshacer}
                onFotoSubidaExito={handleFotoSubidaExito}
                onMostrarError={(msg) => setMensajeErrorAccion(msg)}
              />
            );
          })
        )}
      </main>

      {/* Modal para registrar el motivo de "No pude entregar" */}
      {paradaParaMotivo && (
        <ModalMotivo
          parada={paradaParaMotivo}
          abierto={Boolean(paradaParaMotivo)}
          guardando={guardandoMotivo}
          onCerrar={() => setParadaParaMotivo(null)}
          onConfirmar={handleConfirmarMotivo}
        />
      )}

      {/* Requisito 2: Hoja de conversación desde abajo */}
      <HojaMensajes
        abierta={hojaMensajesAbierta}
        mensajes={mensajes}
        onCerrar={() => setHojaMensajesAbierta(false)}
        onEnviarMensaje={handleEnviarMensaje}
      />

      {/* Resumen fijo en la parte inferior */}
      {!cargandoInicial && totalParadas > 0 && (
        <ResumenFijo totalPlataATraer={plataATraer} />
      )}
    </div>
  );
}
