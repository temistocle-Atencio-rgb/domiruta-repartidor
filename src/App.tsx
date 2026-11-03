import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Parada, Mensaje, InfoSalida, RutaSalida, ResumenSalidaGuardado } from './types.ts';
import {
  infoSalida,
  rutaSalida,
  responderSalida,
  verSalida,
  marcarEntregaDetalle,
  enviarPosicion,
  pausarUbicacion,
  verMensajes,
  enviarMensaje,
  isSupabaseConfigured,
  formatearPesos,
} from './supabase.ts';
import { validarLecturaGps, pegarALaRutaDesde, pegarALaCalle } from './utils/geo.ts';
import { avisarConSonido } from './utils/aviso.ts';
import { Header } from './components/Header.tsx';
import { MapaRuta } from './components/MapaRuta.tsx';
import { TarjetaParada } from './components/TarjetaParada.tsx';
import { SeccionHechas } from './components/SeccionHechas.tsx';
import { ModalMotivo } from './components/ModalMotivo.tsx';
import { ResumenFijo } from './components/ResumenFijo.tsx';
import { AvisoError } from './components/AvisoError.tsx';
import { HojaMensajes } from './components/HojaMensajes.tsx';
import { PantallaAceptarSalida } from './components/PantallaAceptarSalida.tsx';
import { PantallaPermisoGps } from './components/PantallaPermisoGps.tsx';
import { VisorFoto } from './components/VisorFoto.tsx';
import { ModalCorregirUbicacion } from './components/ModalCorregirUbicacion.tsx';
import { PantallaCliente } from './components/PantallaCliente.tsx';
import { PantallaConsultarPedido } from './components/PantallaConsultarPedido.tsx';
import { PantallaMisSalidas } from './components/PantallaMisSalidas.tsx';
import { PegarEnlace } from './components/PegarEnlace.tsx';
import {
  obtenerIdDispositivo,
  obtenerEnlaceGuardado,
  guardarEnlace,
} from './utils/dispositivo.ts';
import { PedidoCliente } from './types.ts';
import { AlertTriangle, RefreshCw, Clock, ChevronDown, ChevronUp, AlertCircle, Check, X } from 'lucide-react';

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
  // Identificador único de este dispositivo móvil (32 caracteres alfanuméricos)
  const dispositivoId = useMemo(() => obtenerIdDispositivo(), []);

  // 1. Detección y manejo reactivo de parámetros de la URL
  const [paramsState, setParamsState] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        codigo: null,
        esCliente: false,
        enlaceCliente: null,
        enlaceRepartidor: null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    const paramR = params.get('r')?.trim() || null;
    const esP = params.has('p');
    const paramP = params.get('p')?.trim() || null;
    const paramS = params.get('s')?.trim() || null;

    if (paramR) {
      guardarEnlace(paramR);
    }
    const enlaceGuardado = obtenerEnlaceGuardado();
    const enlaceRepartidor = paramR || enlaceGuardado;

    // la app instalada abre sin enlace: si este celular ya abrió una salida, vuelve a ella
    let codigoSalida = paramS;
    if (paramS) {
      safeSetStorage('domiruta_ultima_salida', paramS);
    } else if (!esP && !enlaceRepartidor) {
      const ultima = safeGetStorage('domiruta_ultima_salida');
      if (ultima) {
        codigoSalida = ultima;
        const url = new URL(window.location.href);
        url.searchParams.set('s', ultima);
        window.history.replaceState({}, '', url.toString());
      }
    }

    return {
      codigo: codigoSalida,
      esCliente: esP,
      enlaceCliente: paramP,
      enlaceRepartidor,
    };
  });

  const { codigo, esCliente, enlaceCliente, enlaceRepartidor } = paramsState;

  // Escuchar popstate (atrás / adelante en el historial del celular)
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const paramR = params.get('r')?.trim() || null;
      const esP = params.has('p');
      const paramP = params.get('p')?.trim() || null;
      const paramS = params.get('s')?.trim() || null;

      if (paramR) {
        guardarEnlace(paramR);
      }
      const enlaceGuardado = obtenerEnlaceGuardado();
      const enlaceRepartidor = paramR || enlaceGuardado;

      setParamsState({
        codigo: paramS,
        esCliente: esP,
        enlaceCliente: paramP,
        enlaceRepartidor,
      });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Navegar a la pantalla de salida seleccionada
  const handleAbrirSalida = useCallback((codigoSalida: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('s', codigoSalida);
    url.searchParams.delete('r');
    safeSetStorage('domiruta_ultima_salida', codigoSalida);
    window.history.pushState({}, '', url.toString());
    setParamsState((prev) => ({
      ...prev,
      codigo: codigoSalida,
    }));
  }, []);

  // Volver a la pantalla de "Mis salidas"
  const handleVolverAMisSalidas = useCallback(() => {
    const enlace = obtenerEnlaceGuardado();
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    if (enlace) {
      url.searchParams.set('r', enlace);
    }
    window.history.pushState({}, '', url.toString());
    setParamsState((prev) => ({
      ...prev,
      codigo: null,
      enlaceRepartidor: enlace,
    }));
  }, []);


  // Estado para la pantalla de consulta de pedidos (cuando el cliente entra con ?p sin enlace)
  const [pedidoEncontrado, setPedidoEncontrado] = useState<PedidoCliente | null>(null);
  const [consultaCliente, setConsultaCliente] = useState<{ codigo: string; ultimos4: string } | null>(null);

  // 2. Información y Ruta de la salida (Supabase RPC)
  const [info, setInfo] = useState<InfoSalida | null>(null);
  const [rutaData, setRutaData] = useState<RutaSalida | null>(null);
  const rutaDataRef = useRef<RutaSalida | null>(null);
  rutaDataRef.current = rutaData;
  const indiceEnvioRef = useRef<number>(-1); // por qué tramo de la ruta va (para pegar a la calle lo que se manda)
  const [cargandoInfo, setCargandoInfo] = useState<boolean>(true);
  const [cargandoRespuestaSalida, setCargandoRespuestaSalida] = useState<boolean>(false);
  const [salidaVencida, setSalidaVencida] = useState<boolean>(false);

  // Paradas de la salida
  const [paradas, setParadas] = useState<Parada[]>([]);
  const paradasRef = useRef<Parada[]>([]);
  paradasRef.current = paradas;

  const [cargandoInicial, setCargandoInicial] = useState<boolean>(true);
  const [recargandoSegundoPlano, setRecargandoSegundoPlano] = useState<boolean>(false);
  const [salidaCerradaOVacia, setSalidaCerradaOVacia] = useState<boolean>(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Resumen guardado en localStorage para cuando la tienda cierre la salida
  const [resumenGuardado, setResumenGuardado] = useState<ResumenSalidaGuardado | null>(() => {
    if (!codigo) return null;
    const raw = safeGetStorage(`domiruta_salida_${codigo}`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Fotos en memoria y visor a pantalla completa
  const [fotosEnMemoria, setFotosEnMemoria] = useState<Record<string | number, string>>({});
  const [fotoVisor, setFotoVisor] = useState<{ url: string; nombre: string } | null>(null);

  // Estados de interacción por parada
  const [paradaCargandoId, setParadaCargandoId] = useState<string | number | null>(null);
  const [mensajeErrorAccion, setMensajeErrorAccion] = useState<string | null>(null);

  // Modal para "No pude entregar"
  const [paradaParaMotivo, setParadaParaMotivo] = useState<Parada | null>(null);
  const [guardandoMotivo, setGuardandoMotivo] = useState<boolean>(false);

  // Modal para "La casa no está aquí" (corregir ubicación)
  const [paradaParaCorregir, setParadaParaCorregir] = useState<Parada | null>(null);
  const [avisoNotificacion, setAvisoNotificacion] = useState<{
    texto: string;
    tipo: 'exito' | 'info' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!avisoNotificacion) return;
    const timer = setTimeout(() => {
      setAvisoNotificacion(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [avisoNotificacion]);

  // Paradas nuevas agregadas en tiempo real por la tienda
  const [paradasNuevasIds, setParadasNuevasIds] = useState<(string | number)[]>([]);
  const [avisoParadaNueva, setAvisoParadaNueva] = useState<string | null>(null);

  // Chat y mensajes con la tienda
  const [hojaMensajesAbierta, setHojaMensajesAbierta] = useState<boolean>(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [mensajesNuevosNoLeidos, setMensajesNuevosNoLeidos] = useState<number>(0);
  const [avisoMensajeTienda, setAvisoMensajeTienda] = useState<string | null>(null);
  const ultimoIdMensajeRef = useRef<number>(0);

  // --------------------------------------------------------------------------
  // Pantalla 2: Permiso de ubicación (obligatorio antes de aceptar)
  // --------------------------------------------------------------------------
  const [mostrarPantallaPermisoGps, setMostrarPantallaPermisoGps] = useState<boolean>(false);
  const [gpsBloqueado, setGpsBloqueado] = useState<boolean>(false);

  // Ubicación GPS en vivo
  const [ubicacionActiva, setUbicacionActiva] = useState<boolean>(() => {
    const guardado = safeGetStorage('domiruta_ubicacion_activa_' + new URLSearchParams(window.location.search).get('s'));
    return guardado !== 'false'; // Activo por defecto
  });
  const [modalConfirmarPausaAbierto, setModalConfirmarPausaAbierto] = useState<boolean>(false);
  const [posicionMoto, setPosicionMoto] = useState<{ lat: number; lon: number } | null>(null);

  // Conectividad e indicadores de pérdida de señal
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [gpsPerdido, setGpsPerdido] = useState<boolean>(false);

  // Referencias para seguimiento y filtrado GPS
  const rechazosSeguidosRef = useRef(0);
  // marcas hechas sin señal: se guardan en este celular y se mandan solas cuando vuelve
  type MarcaPendiente = { id: string | number; estado: 'entregado' | 'no_entregado' | 'en_camino'; motivo: string; lat: number | null; lon: number | null; hora: number };
  const claveCola = 'domiruta_cola_marcas_' + (codigo || '');
  const [colaMarcas, setColaMarcas] = useState<MarcaPendiente[]>(() => {
    try {
      const t = codigo ? localStorage.getItem('domiruta_cola_marcas_' + codigo) : null;
      return t ? (JSON.parse(t) as MarcaPendiente[]) : [];
    } catch {
      return [];
    }
  });
  const colaMarcasRef = useRef<MarcaPendiente[]>(colaMarcas);
  colaMarcasRef.current = colaMarcas;
  const guardarCola = (l: MarcaPendiente[]) => {
    colaMarcasRef.current = l;
    setColaMarcas(l);
    try {
      if (l.length) localStorage.setItem(claveCola, JSON.stringify(l));
      else localStorage.removeItem(claveCola);
    } catch {
      // sin almacenamiento: la cola vive mientras la página esté abierta
    }
  };
  const correccionesRef = useRef(new Map<string, { lat: number; lon: number; pendiente: boolean }>());
  const aceptandoRef = useRef(false);
  const enviandoRef = useRef(false);
  const ultimaLecturaGpsRef = useRef<{
    lat: number;
    lon: number;
    precision: number;
    rumbo: number | null;
    velocidad: number | null;
    timestamp: number;
  } | null>(null);

  const colaEnviosPendientesRef = useRef<
    Array<{
      lat: number;
      lon: number;
      precision: number;
      rumbo: number | null;
      velocidad: number | null;
    }>
  >([]);

  const watchIdRef = useRef<number | null>(null);
  const ultimoGpsTimestampRef = useRef<number>(Date.now());

  // Otras paradas pendientes plegables
  const [otrasPendientesAbiertas, setOtrasPendientesAbiertas] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Monitoreo de conectividad online/offline
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Carga de info_salida y ruta_salida
  // --------------------------------------------------------------------------
  const cargarDatosSalida = useCallback(async () => {
    if (!isSupabaseConfigured() || !codigo) {
      setCargandoInfo(false);
      return;
    }

    try {
      const [dataInfo, dataRuta] = await Promise.all([
        infoSalida(codigo),
        rutaSalida(codigo),
      ]);

      if (dataInfo) {
        setInfo(dataInfo);
        if (dataInfo.vencida) {
          setSalidaVencida(true);
        }
        if (typeof dataInfo.ubicacion_pausada === 'boolean') {
          setUbicacionActiva(!dataInfo.ubicacion_pausada);
        }
      }
      if (dataRuta) {
        setRutaData(dataRuta);
      }
    } catch (err) {
      console.error('Error al consultar datos de salida:', err);
    } finally {
      setCargandoInfo(false);
    }
  }, [codigo]);

  useEffect(() => {
    cargarDatosSalida();
  }, [cargarDatosSalida]);

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

        // Guardar resumen en localStorage cada vez que cargue bien
        if (ordenadas.length > 0) {
          const entregadasCount = ordenadas.filter((p) => p.estado === 'entregado').length;
          const noEntregadasCount = ordenadas.filter((p) => p.estado === 'no_entregado').length;
          const plataTotal = ordenadas
            .filter((p) => p.estado === 'entregado')
            .reduce((sum, p) => sum + (p.cobrar || 0), 0);

          const nuevoResumen: ResumenSalidaGuardado = {
            entregadas: entregadasCount,
            noEntregadas: noEntregadasCount,
            plataCobrada: plataTotal,
          };
          setResumenGuardado(nuevoResumen);
          safeSetStorage(`domiruta_salida_${codigo}`, JSON.stringify(nuevoResumen));
        }

        // Detectar si en una recarga aparece una parada nueva agregada por la tienda
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

        // las correcciones que hizo el repartidor se mantienen (Supabase guarda la parada con el punto viejo
        // hasta que la tienda la aplica en DomiRuta)
        const corregidas = correccionesRef.current;
        setParadas(
          ordenadas.map((p) => {
            const c = corregidas.get(String(p.id));
            const conCorreccion = c ? { ...p, lat: c.lat, lon: c.lon, ubicacion_pendiente: c.pendiente } : p;
            const q = colaMarcasRef.current.find((x) => String(x.id) === String(p.id));
            return q ? { ...conCorreccion, estado: q.estado, motivo: q.motivo || null, pendiente_envio: true } : conCorreccion;
          })
        );
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
        cargarDatosSalida();
      }
    };

    const handleFocus = () => {
      cargarParadas(false);
      cargarDatosSalida();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [codigo, cargarParadas, cargarDatosSalida]);

  // --------------------------------------------------------------------------
  // Chat con la tienda (ver_mensajes y enviar_mensaje)
  // --------------------------------------------------------------------------
  const consultarMensajes = useCallback(async () => {
    if (!codigo || !isSupabaseConfigured()) return;

    try {
      const pDesde = hojaMensajesAbierta ? 0 : ultimoIdMensajeRef.current;
      const nuevos = await verMensajes(codigo, pDesde);

      if (nuevos && nuevos.length > 0) {
        setMensajes((prev) => {
          if (hojaMensajesAbierta) {
            const maxId = Math.max(...nuevos.map((m) => m.id), 0);
            if (maxId > ultimoIdMensajeRef.current) {
              ultimoIdMensajeRef.current = maxId;
            }
            return nuevos;
          }

          const existentesIds = new Set(prev.map((m) => m.id));
          const soloNuevos = nuevos.filter((m) => !existentesIds.has(m.id));
          if (soloNuevos.length === 0) return prev;

          const maxId = Math.max(...soloNuevos.map((m) => m.id));
          if (maxId > ultimoIdMensajeRef.current) {
            ultimoIdMensajeRef.current = maxId;
          }

          // Notificar si llega mensaje de la tienda con la hoja cerrada
          const deTienda = soloNuevos.filter((m) => m.de === 'tienda');
          if (deTienda.length > 0) {
            const ultimoDeTienda = deTienda[deTienda.length - 1];
            setAvisoMensajeTienda(`Tienda: ${ultimoDeTienda.texto}`);
            avisarConSonido();
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

  const handleAbrirMensajes = () => {
    setHojaMensajesAbierta(true);
    setMensajesNuevosNoLeidos(0);
    setAvisoMensajeTienda(null);
  };

  const handleEnviarMensaje = async (texto: string): Promise<boolean> => {
    if (!codigo) return false;
    const exito = await enviarMensaje(codigo, texto);
    if (exito) {
      consultarMensajes();
      return true;
    }
    return false;
  };

  // --------------------------------------------------------------------------
  // Lógica de GPS en vivo y envío de posición
  // --------------------------------------------------------------------------
  const salidaAceptada = Boolean(info?.aceptada);

  const paradasEnCamino = useMemo(
    () => paradas.filter((p) => p.estado === 'en_camino'),
    [paradas]
  );
  const paradasHechas = useMemo(
    () => paradas.filter((p) => p.estado !== 'en_camino'),
    [paradas]
  );
  const quedanEnCamino = paradasEnCamino.length > 0;
  const todasTerminadas = paradas.length > 0 && paradasEnCamino.length === 0;

  const procesarLecturaRef = useRef<(pos: GeolocationPosition) => void>(() => undefined);
  const pidiendoGpsRef = useRef<boolean>(false);

  // watchPosition: activo mientras la salida esté aceptada y queden entregas
  useEffect(() => {
    if (!salidaAceptada || !quedanEnCamino || !ubicacionActiva || typeof navigator === 'undefined' || !navigator.geolocation) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const alLeer = (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const precision = pos.coords.accuracy || 20;
        const rumbo = pos.coords.heading;
        const velocidad = pos.coords.speed;
        const ahora = Date.now();

        // Validar lectura (filtra precisión > 50 m o saltos imposibles > 120 km/h)
        const ultima = ultimaLecturaGpsRef.current;
        const esValida = validarLecturaGps(
          lat,
          lon,
          precision,
          ultima?.lat ?? null,
          ultima?.lon ?? null,
          ultima?.timestamp ?? null,
          ahora
        );

        if (!esValida) {
          // si el GPS insiste 3 veces seguidas en el sitio nuevo, la mala era la lectura vieja
          rechazosSeguidosRef.current += 1;
          if (rechazosSeguidosRef.current < 3 || precision > 50) {
            return;
          }
        }
        rechazosSeguidosRef.current = 0;

        const nuevaLectura = {
          lat,
          lon,
          precision,
          rumbo: typeof rumbo === 'number' && !isNaN(rumbo) ? rumbo : null,
          velocidad: typeof velocidad === 'number' && !isNaN(velocidad) ? velocidad : null,
          timestamp: ahora,
        };

        ultimaLecturaGpsRef.current = nuevaLectura;
        ultimoGpsTimestampRef.current = ahora;
        setPosicionMoto({ lat, lon });
        setGpsPerdido(false);
      };
    procesarLecturaRef.current = alLeer;
    watchIdRef.current = navigator.geolocation.watchPosition(
      alLeer,
      (err) => {
        console.warn('Error en geolocalización:', err);
        setGpsPerdido(true);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [salidaAceptada, quedanEnCamino, ubicacionActiva]);

  // Detector de señal GPS perdida (si pasan más de 15 segundos sin lecturas válidas)
  useEffect(() => {
    if (!salidaAceptada || !quedanEnCamino || !ubicacionActiva) {
      setGpsPerdido(false);
      return;
    }

    ultimoGpsTimestampRef.current = Date.now(); // recién empieza (o reanudó): todavía no está perdido
    const intervaloGpsCheck = setInterval(() => {
      const tiempoSinGps = Date.now() - ultimoGpsTimestampRef.current;
      if (tiempoSinGps > 15000) {
        setGpsPerdido(true);
      }
    }, 5000);

    return () => clearInterval(intervaloGpsCheck);
  }, [salidaAceptada, quedanEnCamino, ubicacionActiva]);

  // Envío de posición a Supabase cada 5 segundos y vaciado de la cola pendiente
  useEffect(() => {
    if (!salidaAceptada || !quedanEnCamino || !ubicacionActiva || !codigo) return;

    const intervaloEnvio = setInterval(async () => {
      const actual = ultimaLecturaGpsRef.current;
      // quieto, el celular deja de mandar lecturas: se le pide una nueva (así el cliente no pierde la moto)
      if ((!actual || Date.now() - actual.timestamp > 10000) && !pidiendoGpsRef.current) {
        pidiendoGpsRef.current = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            pidiendoGpsRef.current = false;
            procesarLecturaRef.current(pos);
          },
          () => {
            pidiendoGpsRef.current = false;
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }
      // nada viejo (sin señal no se finge que sigue en vivo) y un envío a la vez (sin internet se demoran)
      if (!actual || enviandoRef.current || Date.now() - actual.timestamp > 15000) return;
      enviandoRef.current = true;

      // Las lecturas viejas no se reenvían: la base guarda una cada 4 s y moverían la moto hacia atrás.
      // Basta con mandar la más reciente apenas vuelva el internet.
      colaEnviosPendientesRef.current = [];
      // Enviar la posición más reciente
      try {
        // se manda el punto ya pegado a la calle: así la tienda y el cliente también ven la moto en la vía
        const r = rutaDataRef.current;
        const enRuta = pegarALaRutaDesde([actual.lat, actual.lon], r?.ruta, indiceEnvioRef.current);
        if (enRuta) {
          indiceEnvioRef.current = enRuta.indice;
        }
        const punto = enRuta ? enRuta.punto : pegarALaCalle([actual.lat, actual.lon], null, r?.calles);
        const ok = await enviarPosicion(
          codigo,
          punto[0],
          punto[1],
          actual.precision,
          actual.rumbo,
          actual.velocidad
        );

        if (!ok) {
          // Si falla, guardar en la cola para reintento
          colaEnviosPendientesRef.current.push({
            lat: actual.lat,
            lon: actual.lon,
            precision: actual.precision,
            rumbo: actual.rumbo,
            velocidad: actual.velocidad,
          });
        }
      } catch {
        colaEnviosPendientesRef.current.push({
          lat: actual.lat,
          lon: actual.lon,
          precision: actual.precision,
          rumbo: actual.rumbo,
          velocidad: actual.velocidad,
        });
      } finally {
        enviandoRef.current = false;
      }
    }, 5000);

    return () => clearInterval(intervaloEnvio);
  }, [salidaAceptada, quedanEnCamino, ubicacionActiva, codigo]);

  // --------------------------------------------------------------------------
  // Pantalla 1 y 2: Aceptar / Rechazar Salida con validación de GPS
  // --------------------------------------------------------------------------
  const ejecutarAceptacionSalida = async () => {
    if (!codigo || aceptandoRef.current) return; // un solo intento a la vez (doble toque o el aviso de cada 3 s)
    aceptandoRef.current = true;
    setCargandoRespuestaSalida(true);
    setMensajeErrorAccion(null);

    try {
      const exito = await responderSalida(codigo, true, '');
      if (exito) {
        setInfo((prev) => (prev ? { ...prev, aceptada: true, rechazada: false } : null));
        setMostrarPantallaPermisoGps(false);
        cargarParadas(false);
      } else {
        // Si responder_salida devuelve false por tiempo o ya tomada
        setSalidaVencida(true);
      }
    } catch {
      setMensajeErrorAccion('No se pudo aceptar la salida. Revisa el internet.');
    } finally {
      aceptandoRef.current = false;
      setCargandoRespuestaSalida(false);
    }
  };

  // Al tocar "Acepto" en Pantalla 1: verificar si ya tiene GPS
  const handleAceptarClick = async () => {
    if (!codigo || cargandoRespuestaSalida || aceptandoRef.current) return;

    // Verificar si el navegador ya concedió el permiso de geolocalización
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const permiso = await navigator.permissions.query({ name: 'geolocation' });
        if (permiso.state === 'granted') {
          // Permiso ya listo: aceptar de una vez
          await ejecutarAceptacionSalida();
          return;
        }
      } catch {
        // Fallback si no soporta query
      }
    }

    // Si aún no está concedido, pasar a Pantalla 2 (Permiso de ubicación)
    setMostrarPantallaPermisoGps(true);
  };

  // Solicitar ubicación en Pantalla 2
  const handleSolicitarGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsBloqueado(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPosicionMoto({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsBloqueado(false);
        await ejecutarAceptacionSalida();
      },
      (err) => {
        console.warn('Permiso de GPS no concedido:', err);
        setGpsBloqueado(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // Polling cada 3 segundos cuando el GPS está bloqueado para detectar cuando el usuario lo active
  useEffect(() => {
    if (!mostrarPantallaPermisoGps || !gpsBloqueado || typeof navigator === 'undefined' || !('permissions' in navigator)) {
      return;
    }

    const intervaloPermiso = setInterval(async () => {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'granted') {
          clearInterval(intervaloPermiso);
          setGpsBloqueado(false);
          await ejecutarAceptacionSalida();
        }
      } catch {
        // Ignorar
      }
    }, 3000);

    return () => clearInterval(intervaloPermiso);
  }, [mostrarPantallaPermisoGps, gpsBloqueado]);

  // Rechazo de salida
  const handleRechazarSalida = async (motivo: string) => {
    if (!codigo || cargandoRespuestaSalida) return;
    setCargandoRespuestaSalida(true);
    setMensajeErrorAccion(null);

    try {
      const exito = await responderSalida(codigo, false, motivo);
      if (exito) {
        setInfo((prev) => (prev ? { ...prev, aceptada: false, rechazada: true } : null));
      } else {
        setSalidaVencida(true); // ya venció o la tomó otro
      }
    } catch {
      setMensajeErrorAccion('No se pudo enviar el rechazo. Revisa el internet.');
    }
    setCargandoRespuestaSalida(false);
  };

  // --------------------------------------------------------------------------
  // Interruptor de compartir ubicación con diálogo de confirmación para apagar
  // --------------------------------------------------------------------------
  const handleAlternarUbicacion = () => {
    if (ubicacionActiva) {
      // Pedir confirmación antes de apagar
      setModalConfirmarPausaAbierto(true);
    } else {
      // Reanudar inmediatamente
      if (codigo) {
        pausarUbicacion(codigo, false).then((ok) => {
          if (ok) {
            setUbicacionActiva(true);
            safeSetStorage('domiruta_ubicacion_activa_' + codigo, 'true');
          } else {
            setMensajeErrorAccion('No se pudo volver a compartir la ubicación. Revisa el internet e intenta otra vez.');
          }
        });
      }
    }
  };

  const handleConfirmarApagarUbicacion = () => {
    setModalConfirmarPausaAbierto(false);
    if (codigo) {
      pausarUbicacion(codigo, true).then((ok) => {
        if (ok) {
          setUbicacionActiva(false);
          safeSetStorage('domiruta_ubicacion_activa_' + codigo, 'false');
        } else {
          setMensajeErrorAccion('No se pudo pausar la ubicación. Revisa el internet e intenta otra vez.');
        }
      });
    }
  };

  // --------------------------------------------------------------------------
  // Marcar entregas con la posición GPS actual
  // --------------------------------------------------------------------------
  /**
   * Marca la parada. Sin señal la guarda en la cola (queda marcada en pantalla con «Se enviará…»).
   * Devuelve false solo si la base la rechazó.
   */
  const marcarConCola = async (
    paradaId: string | number,
    estado: 'entregado' | 'no_entregado' | 'en_camino',
    motivo: string
  ): Promise<boolean> => {
    if (!codigo) return false;
    const latGps = posicionMoto?.lat ?? null;
    const lonGps = posicionMoto?.lon ?? null;
    const sinEsta = colaMarcasRef.current.filter((x) => String(x.id) !== String(paradaId));
    const r = navigator.onLine
      ? await marcarEntregaDetalle(codigo, paradaId, estado, motivo, latGps, lonGps)
      : 'sin_red';
    if (r === 'rechazada') {
      guardarCola(sinEsta);
      setMensajeErrorAccion('La tienda ya cerró esta salida');
      return false;
    }
    const pendiente = r === 'sin_red';
    guardarCola(pendiente
      ? [...sinEsta, { id: paradaId, estado, motivo, lat: latGps, lon: lonGps, hora: Date.now() }]
      : sinEsta);
    setParadas((prev) =>
      prev.map((p) =>
        String(p.id) === String(paradaId)
          ? { ...p, estado, motivo: estado === 'no_entregado' ? motivo : null, pendiente_envio: pendiente }
          : p
      )
    );
    return true;
  };

  // Se reintenta la cola cada 10 s y apenas vuelve la conexión
  useEffect(() => {
    if (!codigo) return;
    let enviando = false;
    const vaciar = async () => {
      if (enviando || colaMarcasRef.current.length === 0 || !navigator.onLine) return;
      enviando = true;
      try {
        for (const m of [...colaMarcasRef.current]) {
          const r = await marcarEntregaDetalle(codigo, m.id, m.estado, m.motivo, m.lat, m.lon);
          if (r === 'sin_red') break;
          guardarCola(colaMarcasRef.current.filter((x) => !(String(x.id) === String(m.id) && x.hora === m.hora)));
          if (r === 'rechazada') {
            setMensajeErrorAccion('La tienda ya cerró esta salida');
          }
          setParadas((prev) => prev.map((p) => (String(p.id) === String(m.id) ? { ...p, pendiente_envio: false } : p)));
        }
      } finally {
        enviando = false;
      }
    };
    const intervalo = setInterval(vaciar, 10000);
    window.addEventListener('online', vaciar);
    vaciar();
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('online', vaciar);
    };
  }, [codigo]);

  const handleMarcarEntregado = async (parada: Parada) => {
    if (paradaCargandoId !== null || !codigo) return;
    setParadaCargandoId(parada.id);
    setMensajeErrorAccion(null);
    await marcarConCola(parada.id, 'entregado', '');
    setParadaCargandoId(null);
  };

  const handleDeshacer = async (parada: Parada) => {
    if (paradaCargandoId !== null || !codigo) return;
    setParadaCargandoId(parada.id);
    setMensajeErrorAccion(null);
    await marcarConCola(parada.id, 'en_camino', '');
    setParadaCargandoId(null);
  };

  const handleConfirmarMotivo = async (motivo: string) => {
    if (!paradaParaMotivo || guardandoMotivo || !codigo) return;
    const paradaId = paradaParaMotivo.id;
    setGuardandoMotivo(true);
    setMensajeErrorAccion(null);
    if (await marcarConCola(paradaId, 'no_entregado', motivo)) {
      setParadaParaMotivo(null);
    }
    setGuardandoMotivo(false);
  };

  // Pantalla encendida mientras va en ruta (en la moto el celular va en el soporte)
  useEffect(() => {
    const enRuta = Boolean(info?.aceptada) && paradas.some((p) => p.estado === 'en_camino');
    if (!enRuta || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let candado: { release: () => Promise<void> } | null = null;
    const pedir = async () => {
      try {
        if (document.visibilityState === 'visible') {
          candado = await (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
        }
      } catch {
        // el navegador no lo permite: la página sigue igual
      }
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      document.removeEventListener('visibilitychange', pedir);
      candado?.release().catch(() => undefined);
    };
  }, [info?.aceptada, paradas]);

  const handleFotoSubidaExito = (paradaId: string | number, dataUrl: string) => {
    setFotosEnMemoria((prev) => ({ ...prev, [paradaId]: dataUrl }));
    setParadas((prev) =>
      prev.map((p) => (p.id === paradaId ? { ...p, tiene_foto: true } : p))
    );
  };

  // Obtener última lectura de GPS si se leyó hace menos de 30s y con precisión < 50m
  const obtenerGpsFresco = useCallback((): { lat: number; lon: number } | null => {
    const lectura = ultimaLecturaGpsRef.current;
    if (!lectura) return null;
    const ahora = Date.now();
    const esReciente = ahora - lectura.timestamp < 30000;
    const esPrecisa = lectura.precision < 50;
    if (esReciente && esPrecisa) {
      return { lat: lectura.lat, lon: lectura.lon };
    }
    return null;
  }, []);

  // Manejar respuesta exitosa de corrección de ubicación
  const handleExitoCorregirUbicacion = (
    paradaId: string | number,
    nuevaLat: number,
    nuevaLon: number,
    tipo: 'aplicada' | 'pendiente'
  ) => {
    correccionesRef.current.set(String(paradaId), { lat: nuevaLat, lon: nuevaLon, pendiente: tipo === 'pendiente' });
    setParadas((prev) =>
      prev.map((p) =>
        String(p.id) === String(paradaId)
          ? {
              ...p,
              lat: nuevaLat,
              lon: nuevaLon,
              ubicacion_pendiente: tipo === 'pendiente',
            }
          : p
      )
    );

    if (tipo === 'aplicada') {
      setAvisoNotificacion({
        texto: 'Listo, la ubicación quedó corregida',
        tipo: 'exito',
      });
    } else {
      setAvisoNotificacion({
        texto: 'Gracias. La tienda revisará la ubicación',
        tipo: 'info',
      });
    }

    setParadaParaCorregir(null);
  };

  // Cálculos de totales
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

  // Formato para hora de creación en el chat
  const horaSalidaChatTexto = useMemo(() => {
    if (!info?.creada) return 'Salida activa';
    try {
      const fecha = new Date(info.creada);
      const horaStr = new Intl.DateTimeFormat('es-CO', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(fecha);
      return `Salida de las ${horaStr}`;
    } catch {
      return 'Salida activa';
    }
  }, [info?.creada]);

  // ========================================================
  // CASO A1: Pantalla del cliente (?p=ENLACE o ?p para consultar)
  // ========================================================
  if (esCliente) {
    if (enlaceCliente) {
      return <PantallaCliente enlace={enlaceCliente} />;
    }
    if (pedidoEncontrado && consultaCliente) {
      return (
        <PantallaCliente
          consultaInicial={consultaCliente}
          pedidoInicial={pedidoEncontrado}
          onVolverAConsulta={() => {
            setPedidoEncontrado(null);
            setConsultaCliente(null);
          }}
        />
      );
    }
    return (
      <PantallaConsultarPedido
        onPedidoEncontrado={(pedido, consulta) => {
          setPedidoEncontrado(pedido);
          setConsultaCliente(consulta);
        }}
      />
    );
  }

  // ========================================================
  // CASO B: Supabase no está configurado
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
  // CASO C: Enlace sin parámetro `s` (o acceso directo a Mis salidas / PWA)
  // ========================================================
  if (!codigo) {
    if (enlaceRepartidor) {
      return (
        <PantallaMisSalidas
          enlace={enlaceRepartidor}
          dispositivo={dispositivoId}
          onAbrirSalida={handleAbrirSalida}
        />
      );
    }

    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-12 h-14"
              viewBox="0 0 259.8 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
          </div>
          <div>
            <h1 className="font-poppins font-bold text-[19px] text-[#003A73] leading-tight m-0">
              DomiRuta Repartidor
            </h1>
            <p className="font-inter text-[14.5px] text-[#5B6670] mt-2 mb-0 leading-relaxed">
              Abre el enlace que te mandó la tienda por WhatsApp.
            </p>
          </div>
          <PegarEnlace />
        </div>
      </main>
    );
  }

  // ========================================================
  // CASO D: Salida vencida
  // ========================================================
  if (salidaVencida || info?.vencida) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#B03030]/10 text-[#B03030] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-[#B03030]" strokeWidth={2} />
          </div>
          <h1 className="font-poppins font-bold text-[19px] text-[#003A73] leading-tight m-0">
            Esta salida ya no está disponible
          </h1>
          <p className="font-inter text-[14px] text-[#5B6670] m-0">
            El tiempo para responder venció o la salida fue asignada a otro repartidor.
          </p>
        </div>
      </main>
    );
  }

  // ========================================================
  // CASO E: Salida rechazada por el repartidor
  // ========================================================
  if (!cargandoInfo && info?.rechazada) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-12 h-14"
              viewBox="0 0 259.8 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
              <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
              <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
            </svg>
          </div>
          <p className="font-inter text-[15px] text-[#1F2933] leading-relaxed m-0 font-medium">
            Le avisaste a la tienda que no puedes llevar esta salida. Gracias.
          </p>
        </div>
      </main>
    );
  }

  // ========================================================
  // CASO F: Pantalla 2 (Permiso de ubicación antes de aceptar)
  // ========================================================
  if (mostrarPantallaPermisoGps) {
    return (
      <PantallaPermisoGps
        bloqueado={gpsBloqueado}
        onSolicitarGps={handleSolicitarGps}
        onRevisarPermiso={handleSolicitarGps}
      />
    );
  }

  // ========================================================
  // CASO G: Pantalla 1 (Salida nueva antes de aceptar)
  // ========================================================
  if (!cargandoInfo && info && !info.aceptada && !info.rechazada) {
    return (
      <>
        <PantallaAceptarSalida
          tienda={info.tienda}
          venceEn={info.vence_en}
          vencida={info.vencida}
          distanciaM={info.distancia_m}
          tiendaLat={info.tienda_lat}
          tiendaLon={info.tienda_lon}
          posicionUsuarioGps={posicionMoto}
          paradas={paradas}
          rutaData={rutaData}
          cargandoRespuesta={cargandoRespuestaSalida}
          onAceptar={handleAceptarClick}
          onRechazar={handleRechazarSalida}
          onAbrirMensajes={handleAbrirMensajes}
          mensajesNuevos={mensajesNuevosNoLeidos}
          onVolverAMisSalidas={obtenerEnlaceGuardado() ? handleVolverAMisSalidas : undefined}
        />

        <HojaMensajes
          abierta={hojaMensajesAbierta}
          mensajes={mensajes}
          horaSalidaTexto={horaSalidaChatTexto}
          onCerrar={() => setHojaMensajesAbierta(false)}
          onEnviarMensaje={handleEnviarMensaje}
        />
      </>
    );
  }

  // ========================================================
  // CASO H: Salida ya cerrada por la tienda
  // ========================================================
  if (!cargandoInicial && !cargandoInfo && salidaCerradaOVacia) {
    // aunque este celular nunca la haya abierto antes (por ejemplo, un enlace viejo que la tienda reemplazó)
    {
      return (
        <div className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[5px] border border-[#E3E7EC] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 text-center space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-12 h-14"
                viewBox="0 0 259.8 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <polygon fill="#F28C1B" points="0,75 129.9,0 259.8,75 129.9,150" />
                <polygon fill="#005198" points="0,75 129.9,150 129.9,300 0,225" />
                <polygon fill="#003A73" points="129.9,150 259.8,75 259.8,225 129.9,300" />
              </svg>
            </div>
            <div>
              <h1 className="font-poppins font-bold text-[20px] text-[#003A73] mb-1 leading-tight">
                Salida cerrada
              </h1>
              <p className="font-inter text-[15px] text-[#1F2933] leading-snug m-0">
                {resumenGuardado
                  ? 'La tienda ya cerró esta salida. ¡Gracias!'
                  : 'Este enlace ya no tiene entregas: la tienda cerró la salida o te mandó un enlace nuevo. Abre el último enlace que te llegó.'}
              </p>
            </div>
            {resumenGuardado && (
              <div className="pt-3 border-t border-[#E3E7EC] font-inter text-[14px] text-[#5B6670] leading-relaxed">
                Entregadas: <strong className="text-[#1F2933]">{resumenGuardado.entregadas}</strong> ·{' '}
                No entregadas: <strong className="text-[#1F2933]">{resumenGuardado.noEntregadas}</strong> ·{' '}
                Cobraste: <strong className="text-[#003A73]">{formatearPesos(resumenGuardado.plataCobrada)}</strong>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // ========================================================
  // PANTALLAS 3 & 4: Ruta en curso / Salida terminada
  // ========================================================
  const proximaEntrega = paradasEnCamino.length > 0 ? paradasEnCamino[0] : null;
  const siguientesEntregas = paradasEnCamino.length > 1 ? paradasEnCamino.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col pb-24">
      {/* Barra superior en azul profundo con el nombre de la tienda */}
      <Header
        tiendaNombre={info?.tienda}
        entregadas={paradasEntregadas}
        total={totalParadas}
        cargando={recargandoSegundoPlano || cargandoInicial}
        onRecargar={() => {
          cargarParadas(false);
          cargarDatosSalida();
        }}
        codigo={codigo}
        mensajesNuevos={mensajesNuevosNoLeidos}
        onAbrirMensajes={handleAbrirMensajes}
        ubicacionActiva={ubicacionActiva && !todasTerminadas}
        onAlternarUbicacion={handleAlternarUbicacion}
        onVolverAMisSalidas={obtenerEnlaceGuardado() ? handleVolverAMisSalidas : undefined}
      />

      {/* Barra roja fija arriba del mapa si se pierde GPS o internet */}
      {(!isOnline || (gpsPerdido && ubicacionActiva && !todasTerminadas)) && (
        <div
          role="alert"
          className="bg-[#B03030] text-white py-1.5 px-4 text-center text-xs font-poppins font-medium shadow-sm z-20 sticky top-[88px]"
        >
          {!isOnline ? 'Sin internet' : 'Sin ubicación: revisa el GPS'}
        </div>
      )}

      {/* Aviso flotante de mensaje de la tienda con el chat cerrado */}
      {avisoMensajeTienda && !hojaMensajesAbierta && (
        <aside
          role="status"
          aria-live="polite"
          onClick={handleAbrirMensajes}
          className="fixed top-24 left-4 right-4 z-40 max-w-md mx-auto bg-white border-l-4 border-[#005198] rounded-[5px] shadow-[0_4px_14px_rgba(0,0,0,0.18)] p-3.5 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 cursor-pointer"
        >
          <div className="min-w-0">
            <span className="font-poppins font-bold text-xs uppercase tracking-wide text-[#003A73] block mb-0.5">
              Mensaje de la tienda
            </span>
            <p className="font-inter text-[14px] font-medium text-[#1F2933] leading-snug m-0 break-words line-clamp-2">
              {avisoMensajeTienda}
            </p>
          </div>
        </aside>
      )}

      {/* Aviso de nueva parada agregada por la tienda */}
      {avisoParadaNueva && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-24 left-4 right-4 z-40 max-w-md mx-auto bg-white border-l-4 border-[#005198] rounded-[5px] shadow-[0_4px_14px_rgba(0,0,0,0.18)] p-3.5 flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-200"
        >
          <AlertTriangle className="w-5 h-5 text-[#005198] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="font-inter text-[14px] font-semibold text-[#003A73] leading-snug m-0">
            {avisoParadaNueva}
          </p>
        </aside>
      )}

      {/* Banner de error general */}
      <AvisoError
        mensaje={mensajeErrorAccion}
        onCerrar={() => setMensajeErrorAccion(null)}
      />

      {/* Aviso de corrección de ubicación u otras acciones */}
      {avisoNotificacion && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed top-20 left-4 right-4 z-40 max-w-md mx-auto bg-white border-l-4 ${
            avisoNotificacion.tipo === 'exito'
              ? 'border-[#1E7A44]'
              : avisoNotificacion.tipo === 'error'
              ? 'border-[#B03030]'
              : 'border-[#005198]'
          } rounded-[5px] shadow-[0_4px_14px_rgba(0,0,0,0.18)] p-3.5 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {avisoNotificacion.tipo === 'exito' && (
              <Check className="w-5 h-5 text-[#1E7A44] flex-shrink-0" strokeWidth={2.5} />
            )}
            <p
              className={`font-inter text-[14px] font-medium leading-snug m-0 ${
                avisoNotificacion.tipo === 'exito'
                  ? 'text-[#1E7A44]'
                  : avisoNotificacion.tipo === 'error'
                  ? 'text-[#B03030]'
                  : 'text-[#003A73]'
              }`}
            >
              {avisoNotificacion.texto}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAvisoNotificacion(null)}
            className="w-7 h-7 -mr-1 -mt-1 flex items-center justify-center rounded-[5px] text-[#5B6670] hover:text-[#1F2933] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </aside>
      )}

      {/* Contenido principal */}
      <main className="flex-1 w-full flex flex-col">
        {/* Pantalla 4: Si no queda ninguna parada en camino, se muestra el bloque de terminada */}
        {todasTerminadas ? (
          <div className="max-w-md mx-auto w-full px-4 pt-6 pb-4 space-y-4 text-center">
            <div className="py-4">
              {/* Texto verde sin fondo según manual de marca */}
              {colaMarcas.length > 0 ? (
                <h2 className="font-poppins font-bold text-[22px] text-[#8A4B00] leading-snug m-0">
                  Hay entregas por enviar: no cierres la app
                </h2>
              ) : (
                <h2 className="font-poppins font-bold text-[22px] text-[#1E7A44] leading-snug m-0">
                  Terminaste. Regresa a la tienda con {formatearPesos(plataATraer)}
                </h2>
              )}
              <p className="font-inter text-[14px] text-[#5B6670] mt-2 mb-0">
                Todas las paradas han sido atendidas.
              </p>
            </div>

            {/* Sección Hechas con detalle de lo realizado */}
            <SeccionHechas
              paradasHechas={paradasHechas}
              cargandoParadaId={paradaCargandoId}
              fotosEnMemoria={fotosEnMemoria}
              onDeshacer={handleDeshacer}
              onVerFotoGrande={(url, nombre) => setFotoVisor({ url, nombre })}
            />
          </div>
        ) : (
          /* Pantalla 3: Ruta en curso con mapa (~45% alto) y próxima entrega destacada */
          <>
            {/* Mapa Leaflet interactivo con la ruta y moto en vivo */}
            <MapaRuta
              paradas={paradas}
              rutaSalidaData={rutaData}
              tiendaLat={info?.tienda_lat}
              tiendaLon={info?.tienda_lon}
              posicionActualGps={posicionMoto}
              mostrarMoto={ubicacionActiva}
              className="h-[44vh] min-h-[240px] w-full flex-shrink-0"
            />

            <div className="max-w-md mx-auto w-full px-3.5 pt-3.5 space-y-3.5">
              {errorCarga && (
                <div className="bg-white border-l-4 border-[#B03030] p-3 rounded-[5px] text-[13.5px] font-inter text-[#B03030] shadow-sm flex items-center justify-between">
                  <span>{errorCarga}</span>
                  <button
                    onClick={() => {
                      cargarParadas(false);
                      cargarDatosSalida();
                    }}
                    className="text-[#005198] font-poppins font-semibold text-xs underline cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Próxima entrega destacada */}
              {proximaEntrega && (
                <section aria-label="Próxima entrega">
                  <TarjetaParada
                    parada={proximaEntrega}
                    codigo={codigo}
                    esDestacada={true}
                    cargandoEstaParada={paradaCargandoId === proximaEntrega.id}
                    fotoEnMemoria={fotosEnMemoria[proximaEntrega.id]}
                    onMarcarEntregado={handleMarcarEntregado}
                    onAbrirModalNoEntregado={(p) => setParadaParaMotivo(p)}
                    onDeshacer={handleDeshacer}
                    onFotoSubidaExito={handleFotoSubidaExito}
                    onMostrarError={(msg) => setMensajeErrorAccion(msg)}
                    onVerFotoGrande={(url, nombre) => setFotoVisor({ url, nombre })}
                    salidaAceptada={salidaAceptada}
                    onCorregirUbicacion={(p) => setParadaParaCorregir(p)}
                    tienda={info?.tienda ?? ''}
                  />
                </section>
              )}

              {/* Lista plegable de las demás paradas pendientes */}
              {siguientesEntregas.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setOtrasPendientesAbiertas((prev) => !prev)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 bg-white border border-[#E3E7EC] rounded-[5px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-between transition-colors hover:bg-[#F2F4F7] cursor-pointer"
                    aria-expanded={otrasPendientesAbiertas}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-poppins font-bold text-[15px] text-[#003A73]">
                        Siguientes paradas ({siguientesEntregas.length})
                      </span>
                      <span className="font-inter text-xs text-[#5B6670]">
                        {otrasPendientesAbiertas ? 'Toca para ocultar' : 'Toca para ver'}
                      </span>
                    </div>
                    {otrasPendientesAbiertas ? (
                      <ChevronUp className="w-5 h-5 text-[#003A73]" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#003A73]" strokeWidth={2} />
                    )}
                  </button>

                  {otrasPendientesAbiertas && (
                    <div className="mt-2.5 space-y-3 animate-in fade-in duration-200">
                      {siguientesEntregas.map((parada) => (
                        <TarjetaParada
                          key={parada.id}
                          parada={parada}
                          codigo={codigo}
                          esDestacada={false}
                          cargandoEstaParada={paradaCargandoId === parada.id}
                          fotoEnMemoria={fotosEnMemoria[parada.id]}
                          onMarcarEntregado={handleMarcarEntregado}
                          onAbrirModalNoEntregado={(p) => setParadaParaMotivo(p)}
                          onDeshacer={handleDeshacer}
                          onFotoSubidaExito={handleFotoSubidaExito}
                          onMostrarError={(msg) => setMensajeErrorAccion(msg)}
                          onVerFotoGrande={(url, nombre) => setFotoVisor({ url, nombre })}
                          salidaAceptada={salidaAceptada}
                          onCorregirUbicacion={(p) => setParadaParaCorregir(p)}
                          tienda={info?.tienda ?? ''}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sección Hechas plegada por defecto */}
              <SeccionHechas
                paradasHechas={paradasHechas}
                cargandoParadaId={paradaCargandoId}
                fotosEnMemoria={fotosEnMemoria}
                onDeshacer={handleDeshacer}
                onVerFotoGrande={(url, nombre) => setFotoVisor({ url, nombre })}
              />
            </div>
          </>
        )}
      </main>

      {/* Modal de confirmación para apagar la ubicación */}
      {modalConfirmarPausaAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-sm rounded-[5px] border border-[#E3E7EC] shadow-[0_4px_20px_rgba(0,0,0,0.18)] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#8A4B00]/10 text-[#8A4B00] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-[#8A4B00]" strokeWidth={2} />
            </div>
            <div className="text-center">
              <h3 className="font-poppins font-bold text-[17px] text-[#003A73] m-0">
                ¿Apagar la ubicación?
              </h3>
              <p className="font-inter text-[13.5px] text-[#5B6670] mt-1.5 mb-0 leading-relaxed">
                Si apagas la ubicación, la tienda no sabrá dónde estás y el cliente no verá su entrega acercarse. ¿Seguro?
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmarApagarUbicacion}
                className="w-full h-[48px] bg-[#B03030] hover:bg-[#972727] text-white rounded-[5px] font-poppins font-semibold text-[14px] flex items-center justify-center transition-colors cursor-pointer select-none"
              >
                Sí, apagar
              </button>
              <button
                type="button"
                onClick={() => setModalConfirmarPausaAbierto(false)}
                className="w-full h-[44px] bg-transparent hover:bg-black/5 text-[#005198] rounded-[5px] font-poppins font-medium text-[14px] flex items-center justify-center transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para motivo de no entrega */}
      {paradaParaMotivo && (
        <ModalMotivo
          parada={paradaParaMotivo}
          abierto={Boolean(paradaParaMotivo)}
          guardando={guardandoMotivo}
          onCerrar={() => setParadaParaMotivo(null)}
          onConfirmar={handleConfirmarMotivo}
        />
      )}

      {/* Modal para "La casa no está aquí" (corregir ubicación arrastrando el pin) */}
      {paradaParaCorregir && codigo && (
        <ModalCorregirUbicacion
          parada={paradaParaCorregir}
          codigo={codigo}
          posicionGps={posicionMoto}
          obtenerGpsFresco={obtenerGpsFresco}
          onCerrar={() => setParadaParaCorregir(null)}
          onExito={handleExitoCorregirUbicacion}
        />
      )}

      {/* Chat con la tienda */}
      <HojaMensajes
        abierta={hojaMensajesAbierta}
        mensajes={mensajes}
        horaSalidaTexto={horaSalidaChatTexto}
        onCerrar={() => setHojaMensajesAbierta(false)}
        onEnviarMensaje={handleEnviarMensaje}
      />

      {/* Visor de foto en pantalla completa */}
      <VisorFoto
        fotoUrl={fotoVisor?.url || null}
        nombreParada={fotoVisor?.nombre}
        onCerrar={() => setFotoVisor(null)}
      />

      {/* Resumen fijo en la parte inferior */}
      {!cargandoInicial && totalParadas > 0 && !todasTerminadas && (
        <ResumenFijo totalPlataATraer={plataATraer} />
      )}
    </div>
  );
}
