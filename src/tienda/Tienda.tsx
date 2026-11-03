import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Catalogo as TCatalogo, Carrito as TCarrito, Producto } from './tipos.ts';
import { verCatalogo, leerCarrito, guardarCarrito, leerUltimoPedido, guardarUltimoPedido } from './datos.ts';
import { Catalogo } from './Catalogo.tsx';
import { Carrito } from './Carrito.tsx';
import { DatosPedido } from './DatosPedido.tsx';
import { PedidoEnviado } from './PedidoEnviado.tsx';
import { DetalleProducto } from './DetalleProducto.tsx';

type Pantalla = 'catalogo' | 'datos' | 'enviado';

function codigoDeLaDireccion(): string | null {
  const c = new URLSearchParams(window.location.search).get('pedido');
  return c && /^[A-Za-z0-9]{8}$/.test(c) ? c.toUpperCase() : null;
}

export function Tienda() {
  const [catalogo, setCatalogo] = useState<TCatalogo | null>(null);
  const [error, setError] = useState('');
  const [carrito, setCarrito] = useState<TCarrito>(leerCarrito);
  const [verCarrito, setVerCarrito] = useState(false);
  const [detalle, setDetalle] = useState<Producto | null>(null);
  const inicial = codigoDeLaDireccion() ?? leerUltimoPedido();
  const [pantalla, setPantalla] = useState<Pantalla>(inicial ? 'enviado' : 'catalogo');
  const [enviado, setEnviado] = useState<{ codigo: string; total: number; nombre: string } | null>(
    inicial ? { codigo: inicial, total: 0, nombre: '' } : null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const c = await verCatalogo();
      setCatalogo(c);
      if (c.tienda.nombre) document.title = `${c.tienda.nombre} · Pedidos en línea`;
      // el ícono de la pestaña es el logo de la tienda (el mismo de la factura)
      if (c.tienda.logo) {
        const l = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (l) l.href = c.tienda.logo;
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { guardarCarrito(carrito); }, [carrito]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pantalla]);

  const porId = useMemo(() => new Map((catalogo?.productos ?? []).map((p) => [p.id, p])), [catalogo]);
  // Lo que ya no está en el catálogo se cae solo del carrito
  const lineas = useMemo(() => Object.entries(carrito)
    .map(([id, n]) => ({ p: porId.get(Number(id))!, n }))
    .filter((l) => l.p), [carrito, porId]);
  const subtotal = lineas.reduce((s, l) => s + (l.p.disponible ? l.p.precio * l.n : 0), 0);
  const unidades = lineas.reduce((s, l) => s + l.n, 0);

  const cambiar = useCallback((id: number, n: number) => {
    setCarrito((c) => {
      const nuevo = { ...c };
      if (n <= 0) delete nuevo[id]; else nuevo[id] = Math.min(99, n);
      return nuevo;
    });
  }, []);
  const cerrarCarrito = useCallback(() => setVerCarrito(false), []);
  const cerrarDetalle = useCallback(() => setDetalle(null), []);

  if (pantalla === 'enviado' && enviado) {
    return <PedidoEnviado {...enviado} otroPedido={() => {
      guardarUltimoPedido(null);
      if (codigoDeLaDireccion()) window.history.replaceState(null, '', window.location.pathname);
      setEnviado(null);
      setPantalla('catalogo');
    }} />;
  }

  if (!catalogo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {error ? (
          <>
            <p className="font-poppins font-semibold text-[17px]">No pudimos abrir la tienda</p>
            <p className="text-[#5B6670] text-[14px] mt-1">{error}</p>
            <button type="button" onClick={cargar}
              className="mt-5 h-12 px-5 rounded-[5px] bg-[#005198] text-white font-poppins font-semibold flex items-center gap-2">
              <RefreshCw size={18} />Intentar otra vez</button>
          </>
        ) : <p className="text-[#5B6670]" role="status">Abriendo la tienda…</p>}
      </div>
    );
  }

  if (pantalla === 'datos' && lineas.length > 0) {
    return <DatosPedido tienda={catalogo.tienda} lineas={lineas} subtotal={subtotal}
      volver={() => setPantalla('catalogo')} recargar={cargar}
      listo={(codigo, total, nombre) => {
        guardarUltimoPedido(codigo);
        setCarrito({});
        setEnviado({ codigo, total, nombre });
        setPantalla('enviado');
      }} />;
  }

  return (
    <>
      <Catalogo catalogo={catalogo} carrito={carrito} cambiar={cambiar} abrirCarrito={() => setVerCarrito(true)}
        subtotal={subtotal} unidades={unidades} verProducto={setDetalle} />
      {detalle && (
        <DetalleProducto p={porId.get(detalle.id) ?? detalle} n={carrito[detalle.id] || 0} cambiar={(n) => cambiar(detalle.id, n)}
          cerrar={cerrarDetalle} verCarrito={() => { setDetalle(null); setVerCarrito(true); }} />
      )}
      {verCarrito && (
        <Carrito tienda={catalogo.tienda} lineas={lineas} carrito={carrito} cambiar={cambiar} vaciar={() => setCarrito({})}
          cerrar={cerrarCarrito} subtotal={subtotal}
          continuar={() => { setVerCarrito(false); setPantalla('datos'); }} />
      )}
    </>
  );
}
