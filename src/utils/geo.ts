/**
 * Utilidades geométricas y de proyección para el mapa y GPS de DomiRuta
 */

export function distanciaHaversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function proyectarPuntoEnSegmento(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): [number, number] {
  const [pLat, pLon] = p;
  const [aLat, aLon] = a;
  const [bLat, bLon] = b;

  const abLat = bLat - aLat;
  const abLon = bLon - aLon;
  const abLongitudCuadrada = abLat * abLat + abLon * abLon;

  if (abLongitudCuadrada === 0) {
    return [aLat, aLon];
  }

  const apLat = pLat - aLat;
  const apLon = pLon - aLon;

  // Factor de proyección t entre 0 y 1
  let t = (apLat * abLat + apLon * abLon) / abLongitudCuadrada;
  t = Math.max(0, Math.min(1, t));

  return [aLat + t * abLat, aLon + t * abLon];
}

export function proyectarEnPolilinea(
  punto: [number, number],
  polilinea: [number, number][]
): { puntoProyectado: [number, number]; distanciaM: number } {
  if (polilinea.length === 0) {
    return { puntoProyectado: punto, distanciaM: 0 };
  }
  if (polilinea.length === 1) {
    return {
      puntoProyectado: polilinea[0],
      distanciaM: distanciaHaversine(punto[0], punto[1], polilinea[0][0], polilinea[0][1]),
    };
  }

  let mejorPunto: [number, number] = polilinea[0];
  let menorDistancia = Infinity;

  for (let i = 0; i < polilinea.length - 1; i++) {
    const a = polilinea[i];
    const b = polilinea[i + 1];
    const proyectado = proyectarPuntoEnSegmento(punto, a, b);
    const dist = distanciaHaversine(punto[0], punto[1], proyectado[0], proyectado[1]);

    if (dist < menorDistancia) {
      menorDistancia = dist;
      mejorPunto = proyectado;
    }
  }

  return { puntoProyectado: mejorPunto, distanciaM: menorDistancia };
}

/**
 * Ajusta la lectura GPS a la calle:
 * 1. Proyecta sobre la ruta; si queda a <= 40 m, va en ese punto de la ruta.
 * 2. Si está más lejos, proyéctala sobre la calle más cercana de `calles`.
 * 3. Si no hay calles o ruta válida, mantiene el punto original.
 */
export function pegarALaCalle(
  posicion: [number, number],
  ruta: [number, number][] | null | undefined,
  calles: [number, number][][] | null | undefined
): [number, number] {
  // 1. Proyección sobre la ruta
  if (ruta && ruta.length > 1) {
    const { puntoProyectado, distanciaM } = proyectarEnPolilinea(posicion, ruta);
    if (distanciaM <= 40) {
      return puntoProyectado;
    }
  }

  // 2. Si está más lejos, proyectar sobre la calle más cercana
  if (calles && calles.length > 0) {
    let mejorPuntoCalle: [number, number] | null = null;
    let menorDistanciaCalle = Infinity;

    for (const calle of calles) {
      if (calle && calle.length > 1) {
        const { puntoProyectado, distanciaM } = proyectarEnPolilinea(posicion, calle);
        if (distanciaM < menorDistanciaCalle) {
          menorDistanciaCalle = distanciaM;
          mejorPuntoCalle = puntoProyectado;
        }
      }
    }

    if (mejorPuntoCalle && menorDistanciaCalle <= 60) {
      return mejorPuntoCalle;
    }
  }

  return posicion;
}

/**
 * Valida si la lectura GPS es admisible:
 * - Ignora lecturas con precisión/error > 50 m
 * - Ignora saltos imposibles (> 120 km/h o 33.3 m/s entre dos lecturas consecutivas)
 */
export function validarLecturaGps(
  nuevaLat: number,
  nuevaLon: number,
  precision: number,
  ultimaLat: number | null,
  ultimaLon: number | null,
  ultimoTimestampMs: number | null,
  nuevoTimestampMs: number
): boolean {
  // Error mayor a 50 metros
  if (precision > 50) {
    return false;
  }

  // Verificar salto imposible
  if (ultimaLat !== null && ultimaLon !== null && ultimoTimestampMs !== null) {
    const tiempoSegundos = (nuevoTimestampMs - ultimoTimestampMs) / 1000;
    if (tiempoSegundos > 0.3) {
      const distM = distanciaHaversine(ultimaLat, ultimaLon, nuevaLat, nuevaLon);
      const velocidadMs = distM / tiempoSegundos;
      // 120 km/h = 33.33 m/s
      if (velocidadMs > 33.33) {
        return false;
      }
    }
  }

  return true;
}

/** Dónde cae un punto sobre la ruta: índice del tramo, fracción dentro del tramo y distancia a la línea. */
function ubicarEnRuta(p: [number, number], ruta: [number, number][]): { i: number; t: number; distM: number } {
  let mejor = { i: 0, t: 0, distM: Infinity };
  for (let i = 0; i < ruta.length - 1; i++) {
    const a = ruta[i];
    const b = ruta[i + 1];
    const abLat = b[0] - a[0];
    const abLon = b[1] - a[1];
    const l2 = abLat * abLat + abLon * abLon;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * abLat + (p[1] - a[1]) * abLon) / l2));
    const q: [number, number] = [a[0] + t * abLat, a[1] + t * abLon];
    const d = distanciaHaversine(p[0], p[1], q[0], q[1]);
    if (d < mejor.distM) {
      mejor = { i, t, distM: d };
    }
  }
  return mejor;
}

/**
 * El camino que debe recorrer la moto para ir de `desde` a `hasta`: si los dos están sobre la ruta y
 * `hasta` va adelante (menos de 400 m), sigue las esquinas de la ruta en vez de cortar por encima de
 * las casas. Si no, va derecho (son puntos ya pegados a la calle y muy cercanos).
 */
export function caminoPorRuta(
  desde: [number, number],
  hasta: [number, number],
  ruta: [number, number][] | null | undefined
): [number, number][] {
  if (!ruta || ruta.length < 2) {
    return [hasta];
  }
  const a = ubicarEnRuta(desde, ruta);
  const b = ubicarEnRuta(hasta, ruta);
  const adelante = b.i > a.i || (b.i === a.i && b.t >= a.t);
  if (a.distM > 5 || b.distM > 5 || !adelante || b.i - a.i > 60) {
    return [hasta];
  }
  const camino: [number, number][] = [];
  let largo = 0;
  let ultimo = desde;
  for (let k = a.i + 1; k <= b.i; k++) {
    largo += distanciaHaversine(ultimo[0], ultimo[1], ruta[k][0], ruta[k][1]);
    ultimo = ruta[k];
    camino.push(ruta[k]);
  }
  largo += distanciaHaversine(ultimo[0], ultimo[1], hasta[0], hasta[1]);
  camino.push(hasta);
  return largo <= 400 ? camino : [hasta];
}

/**
 * Pega la lectura a la ruta buscando primero cerca de donde iba (la ruta puede pasar dos veces por
 * la misma calle o muy cerca de sí misma). Devuelve null si queda a más de 40 m de la ruta.
 */
export function pegarALaRutaDesde(
  p: [number, number],
  ruta: [number, number][] | null | undefined,
  indicePrevio: number
): { punto: [number, number]; indice: number } | null {
  if (!ruta || ruta.length < 2) {
    return null;
  }
  const buscar = (desde: number, hasta: number) => {
    let mejor = { punto: ruta[0] as [number, number], indice: -1, distM: Infinity };
    for (let i = Math.max(0, desde); i < Math.min(ruta.length - 1, hasta); i++) {
      const q = proyectarPuntoEnSegmento(p, ruta[i], ruta[i + 1]);
      const d = distanciaHaversine(p[0], p[1], q[0], q[1]);
      if (d < mejor.distM) {
        mejor = { punto: q, indice: i, distM: d };
      }
    }
    return mejor;
  };
  let r = indicePrevio >= 0 ? buscar(indicePrevio - 3, indicePrevio + 40) : { distM: Infinity, punto: ruta[0], indice: -1 };
  if (r.distM > 40) {
    r = buscar(0, ruta.length); // se adelantó mucho o recién empieza
  }
  return r.distM <= 40 ? { punto: r.punto as [number, number], indice: r.indice } : null;
}
