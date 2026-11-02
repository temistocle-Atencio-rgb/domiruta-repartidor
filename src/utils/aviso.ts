/**
 * Tono corto y vibración para avisar algo nuevo con la app abierta (salida nueva o mensaje de la tienda).
 * Los navegadores solo dejan sonar después de que la persona tocó la pantalla, así que se espera ese toque.
 */
let tocada = false;
let contexto: AudioContext | null = null;

if (typeof window !== 'undefined') {
  const marcar = () => {
    tocada = true;
    window.removeEventListener('pointerdown', marcar);
  };
  window.addEventListener('pointerdown', marcar);
}

export function avisarConSonido(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // algunos navegadores no dejan vibrar
  }
  if (!tocada || typeof window === 'undefined') {
    return;
  }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    contexto = contexto ?? new Ctx();
    const ahora = contexto.currentTime;
    [880, 1175].forEach((frecuencia, i) => {
      const osc = contexto!.createOscillator();
      const vol = contexto!.createGain();
      osc.type = 'sine';
      osc.frequency.value = frecuencia;
      const t = ahora + i * 0.16;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(vol).connect(contexto!.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch {
    // sin sonido no pasa nada
  }
}
