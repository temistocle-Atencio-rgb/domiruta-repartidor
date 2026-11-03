/** Los medios de pago de DomiRuta (mismo nombre que en la caja, en minúscula) con su ícono. */
export const MEDIOS: Record<string, { texto: string; ayuda: string }> = {
  efectivo: { texto: 'Efectivo', ayuda: '' },
  nequi: { texto: 'Nequi', ayuda: 'La tienda te escribe por WhatsApp con el número para pagar.' },
  daviplata: { texto: 'Daviplata', ayuda: 'La tienda te escribe por WhatsApp con el número para pagar.' },
  breb: { texto: 'Bre-B', ayuda: 'La tienda te escribe por WhatsApp con la llave Bre-B.' },
  transferencia: { texto: 'Transferencia', ayuda: 'La tienda te escribe por WhatsApp con la cuenta para transferir.' },
  bancolombia: { texto: 'Bancolombia', ayuda: 'La tienda te escribe por WhatsApp con la cuenta o el QR.' },
  tarjeta_debito: { texto: 'Tarjeta débito', ayuda: 'Pagas con datáfono cuando te lo entreguen.' },
  tarjeta_credito: { texto: 'Tarjeta crédito', ayuda: 'Pagas con datáfono cuando te lo entreguen.' },
  nu: { texto: 'Nu', ayuda: 'La tienda te escribe por WhatsApp con los datos para pagar.' },
  dale: { texto: 'Dale!', ayuda: 'La tienda te escribe por WhatsApp con los datos para pagar.' },
  mercado_pago: { texto: 'Mercado Pago', ayuda: 'La tienda te manda el link o el QR por WhatsApp.' },
};

/** Los que acepta la tienda, en su orden, solo los conocidos. Efectivo siempre. */
export function mediosDe(pagos: string[] | undefined): string[] {
  const l = (pagos ?? []).filter((p) => p in MEDIOS);
  return l.includes('efectivo') ? l : ['efectivo', ...l];
}
