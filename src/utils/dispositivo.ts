/**
 * Utilidades para identificación del dispositivo móvil del repartidor
 * y manejo seguro de almacenamiento local bajo try/catch.
 */

export function obtenerIdDispositivo(): string {
  try {
    const guardado = localStorage.getItem('domiruta_dispositivo');
    if (guardado && guardado.trim().length === 32) {
      return guardado.trim();
    }
  } catch {
    // Almacenamiento no disponible o bloqueado por el navegador
  }

  // Generar cadena de 32 caracteres alfanuméricos
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(32);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let nuevoId = '';
  for (let i = 0; i < 32; i++) {
    nuevoId += chars[bytes[i] % chars.length];
  }

  try {
    localStorage.setItem('domiruta_dispositivo', nuevoId);
  } catch {
    // Continuar si no se puede persistir
  }

  return nuevoId;
}

export function obtenerEnlaceGuardado(): string | null {
  try {
    const enlace = localStorage.getItem('domiruta_enlace');
    return enlace ? enlace.trim() : null;
  } catch {
    return null;
  }
}

export function guardarEnlace(enlace: string): void {
  try {
    localStorage.setItem('domiruta_enlace', enlace.trim());
  } catch {
    // Continuar si el almacenamiento está restringido
  }
}

export function limpiarEnlace(): void {
  try {
    localStorage.removeItem('domiruta_enlace');
  } catch {
    // Ignorar error
  }
}

export function obtenerCacheMisSalidas<T>(): T | null {
  try {
    const raw = localStorage.getItem('domiruta_cache_mis_salidas');
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function guardarCacheMisSalidas(data: unknown): void {
  try {
    localStorage.setItem('domiruta_cache_mis_salidas', JSON.stringify(data));
  } catch {
    // Ignorar error si excede cuota o storage deshabilitado
  }
}
