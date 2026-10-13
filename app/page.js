'use client';

import { useEffect, useState, useRef } from 'react';
import SiteNav from '@/components/SiteNav';
import { subirComprobanteDirecto } from '@/lib/subirComprobante';

const IMG_PH =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#e8ebf4"/>' +
      '<text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#9aa3b8" text-anchor="middle" dy=".35em">Sin foto</text></svg>'
  );

function fmt(n) {
  try { return Number(n).toLocaleString('es-AR'); } catch (e) { return String(n); }
}

function EstadoComprobante({ c }) {
  if (!c) return null;
  if (c.subiendo) return <p className="tcf-archivo-info">⏳ Subiendo "{c.nombreArchivo}"...</p>;
  if (c.error) return <p className="tcf-archivo-info" style={{ color: '#b91c1c' }}>❌ {c.nombreArchivo}: {c.error}</p>;
  return <p className="tcf-archivo-info">📎 {c.nombreArchivo}</p>;
}

function ProductCard({ p, onClick }) {
  const sinStock = p.stock <= 0;
  const img = (p.imagenes && p.imagenes[0]) || IMG_PH;
  const promo = p.tipo === 'oficial' ? p.promo : null;
  return (
    <div className="tcf-card" onClick={() => onClick(p)}>
      <div className="tcf-card-img-wrap">
        <img src={img} alt={p.nombre} loading="lazy" onError={(e) => { e.target.src = IMG_PH; }} />
        {promo && (
          <span className="tcf-badge-promo">
            {promo.tipo === '2X1' ? '2x1' : promo.tipo === 'NXPRECIO' ? `${promo.cantidad}x$${fmt(promo.valor)}` : `-${promo.valor}%`}
          </span>
        )}
      </div>
      <div className="tcf-card-body">
        {p.tipo === 'socio' && <span className="tcf-badge-socio">Producto de socio</span>}
        <p className="tcf-card-nombre">{p.nombre}</p>
        {promo && promo.tipo === 'PORCENTAJE' ? (
          <p className="tcf-card-precio">
            <span className="tcf-precio-tachado">${fmt(p.precio)}</span> ${fmt(promo.precioConDescuento)}
          </p>
        ) : promo && promo.tipo === '2X1' ? (
          <p className="tcf-card-precio">${fmt(p.precio)} <span className="tcf-nota-2x1">llevando 2, el 2do gratis</span></p>
        ) : promo && promo.tipo === 'NXPRECIO' ? (
          <p className="tcf-card-precio">${fmt(p.precio)} <span className="tcf-nota-2x1">llevando {promo.cantidad}, ${fmt(promo.valor)}</span></p>
        ) : (
          <p className="tcf-card-precio">${fmt(p.precio)}</p>
        )}
        <p className={'tcf-card-stock' + (sinStock ? ' tcf-sin-stock' : '')}>{sinStock ? 'Sin stock' : 'Disponible'}</p>
        <button className="tcf-btn-agregar" type="button" disabled={sinStock}>
          {sinStock ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  );
}

function ServiceCard({ s, onClick }) {
  const img = (s.imagenes && s.imagenes[0]) || IMG_PH;
  return (
    <div className="tcf-card" onClick={() => onClick(s)}>
      <div className="tcf-card-img-wrap">
        <img src={img} alt={s.rubro} loading="lazy" onError={(e) => { e.target.src = IMG_PH; }} />
      </div>
      <div className="tcf-card-body">
        <span className="tcf-badge-socio">Servicio de socio</span>
        <p className="tcf-card-nombre">{s.rubro}</p>
        <p className="tcf-card-rubro">{s.vendedorNombre}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {s.disponible
            ? <span className="tcf-badge tcf-badge-disponible">Disponible</span>
            : <span className="tcf-badge tcf-badge-no-disponible">No disponible</span>}
          {s.urgencias && <span className="tcf-badge tcf-badge-urgencias">Urgencias</span>}
        </div>
        <button className="tcf-btn-agregar" type="button">Ver detalle</button>
      </div>
    </div>
  );
}

function VendorCard({ v, onClick }) {
  const d = v.destacado;
  const img = (d && d.imagenes && d.imagenes[0]) || IMG_PH;
  return (
    <div className="tcf-vendor-card" tabIndex={0} role="button" aria-label={'Ver tienda de ' + v.nombre} onClick={() => onClick(v.vendorId)}>
      <div className="tcf-vendor-card-img">
        <img src={img} alt={d ? d.nombre : v.nombre} loading="lazy" onError={(e) => { e.target.src = IMG_PH; }} />
      </div>
      <div className="tcf-vendor-card-overlay">
        <p className="tcf-vendor-card-etiqueta">Tienda de socio</p>
        <p className="tcf-vendor-card-nombre">{v.nombre}</p>
        {d && <p className="tcf-vendor-card-precio">{d.nombre} · ${fmt(d.precio)}</p>}
        <span className="tcf-vendor-card-cta">Ver tienda ›</span>
      </div>
    </div>
  );
}

export default function TiendaPage() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState([]);

  const [productoActual, setProductoActual] = useState(null);
  const [servicioActual, setServicioActual] = useState(null);
  const [sel, setSel] = useState({ talle: '', color: '', cantidad: 1 });
  const [carouselIdx, setCarouselIdx] = useState(0);

  const [vendorDrawer, setVendorDrawer] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [paso, setPaso] = useState(1);

  const [datosComprador, setDatosComprador] = useState({ nombre: '', dni: '', telefono: '', direccion: '', email: '' });
  const [honeypot, setHoneypot] = useState('');
  const [grupos, setGrupos] = useState([]);
  const [comprobantes, setComprobantes] = useState({});
  const [errorCheckout, setErrorCheckout] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [codigoPromo, setCodigoPromo] = useState('');
  const [promoValidada, setPromoValidada] = useState(null);
  const [validandoPromo, setValidandoPromo] = useState(false);
  const [errorPromo, setErrorPromo] = useState('');

  const touchStartX = useRef(0);

  useEffect(() => {
    fetch('/api/tienda?_=' + Date.now(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setDatos(d);
        setCargando(false);
        const cfg = d.config || {};
        const root = document.documentElement;
        if (cfg.ColorPrimario) root.style.setProperty('--color-primario', cfg.ColorPrimario);
        if (cfg.ColorSecundario) root.style.setProperty('--color-secundario', cfg.ColorSecundario);
        if (cfg.ColorAcento) root.style.setProperty('--color-acento', cfg.ColorAcento);
        if (cfg.ColorBordo) root.style.setProperty('--color-bordo', cfg.ColorBordo);
        if (cfg.ImagenBanner) root.style.setProperty('--banner-img', `url('${cfg.ImagenBanner}')`);
      })
      .catch(() => setCargando(false));
  }, []);

  function recargarCatalogo() {
    setCargando(true);
    fetch('/api/tienda?_=' + Date.now(), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { setDatos(d); setCargando(false); })
      .catch(() => setCargando(false));
  }

  const config = (datos && datos.config) || {};

  function abrirModalProducto(p) {
    setProductoActual(p);
    setSel({ talle: (p.talles && p.talles[0]) || '', color: (p.colores && p.colores[0]) || '', cantidad: 1 });
    setCarouselIdx(0);
  }
  function cerrarModalProducto() { setProductoActual(null); }

  function stockDisponible(p, selActual) {
    if (!p) return 0;
    const vs = p.variantesStock || {};
    if (Object.keys(vs).length === 0) return p.stock;
    const key = `${selActual.talle}|${selActual.color}`;
    return vs.hasOwnProperty(key) ? vs[key] : 0;
  }

  function cambiarCantidad(delta) {
    const max = stockDisponible(productoActual, sel);
    setSel((s) => {
      let nueva = s.cantidad + delta;
      if (nueva < 1) nueva = 1;
      if (nueva > max) nueva = max;
      return { ...s, cantidad: nueva };
    });
  }

  function elegirOpcion(clave, valor) {
    setSel((s) => {
      const nuevo = { ...s, [clave]: valor };
      const max = stockDisponible(productoActual, nuevo);
      if (nuevo.cantidad > max) nuevo.cantidad = Math.max(1, max);
      return nuevo;
    });
  }

  function agregarAlCarrito() {
    const p = productoActual;
    const key = `${p.id}|${sel.talle}|${sel.color}`;
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.clave === key);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], cantidad: Math.min(stockDisponible(p, sel), copia[idx].cantidad + sel.cantidad) };
        return copia;
      }
      return [
        ...prev,
        {
          clave: key, id: p.id, tipo: p.tipo, nombre: p.nombre,
          imagen: (p.imagenes && p.imagenes[0]) || '',
          talle: sel.talle, color: sel.color, cantidad: sel.cantidad,
          precio: p.precio, stockMax: stockDisponible(p, sel),
          vendedorId: p.tipo === 'socio' ? p.vendedorId : 'CLUB',
          vendedorNombre: p.tipo === 'socio' ? p.vendedorNombre : (config.NombreTienda || 'Tienda Oficial'),
          vendedorAlias: p.tipo === 'socio' ? p.vendedorAlias : (config.AliasTransferencia || ''),
          vendedorCBU: p.tipo === 'socio' ? p.vendedorCBU : (config.CBU || ''),
        },
      ];
    });
    cerrarModalProducto();
    setCarritoAbierto(true);
  }

  function abrirModalServicio(s) { setServicioActual(s); }
  function cerrarModalServicio() { setServicioActual(null); }

  const totalItems = carrito.reduce((a, i) => a + i.cantidad, 0);
  const totalCarrito = carrito.reduce((a, i) => a + i.precio * i.cantidad, 0);

  const promosAutomaticas = (datos && datos.promosAutomaticas) || [];
  const descuentosPorItem = {};
  {
    const oficialesCarrito = carrito.filter((it) => it.tipo === 'oficial');
    promosAutomaticas.forEach((promo) => {
      if (promo.tipo === '2X1') {
        if (!promo.producto_id) return;
        const coincidencias = oficialesCarrito.filter((it) => it.id === promo.producto_id);
        if (!coincidencias.length) return;
        const cantidadTotal = coincidencias.reduce((a, it) => a + it.cantidad, 0);
        const gratis = Math.floor(cantidadTotal / 2);
        if (gratis <= 0) return;
        const descuentoTotalPromo = gratis * coincidencias[0].precio;
        coincidencias.forEach((it) => {
          const prev = descuentosPorItem[it.clave] || 0;
          descuentosPorItem[it.clave] = prev + descuentoTotalPromo * (it.cantidad / cantidadTotal);
        });
      } else if (promo.tipo === 'NXPRECIO') {
        if (!promo.producto_id) return;
        const cantidadPack = Math.max(2, Math.floor(Number(promo.cantidad) || 0));
        const precioPack = Number(promo.valor) || 0;
        if (cantidadPack < 2 || precioPack <= 0) return;
        const coincidencias = oficialesCarrito.filter((it) => it.id === promo.producto_id);
        if (!coincidencias.length) return;
        const cantidadTotal = coincidencias.reduce((a, it) => a + it.cantidad, 0);
        const packs = Math.floor(cantidadTotal / cantidadPack);
        if (packs <= 0) return;
        const descuentoTotalPromo = Math.max(0, packs * cantidadPack * coincidencias[0].precio - packs * precioPack);
        if (descuentoTotalPromo <= 0) return;
        coincidencias.forEach((it) => {
          const prev = descuentosPorItem[it.clave] || 0;
          descuentosPorItem[it.clave] = prev + descuentoTotalPromo * (it.cantidad / cantidadTotal);
        });
      } else if (promo.tipo === 'PORCENTAJE') {
        const pct = Number(promo.valor) || 0;
        if (pct <= 0) return;
        const afectados = promo.alcance === 'PRODUCTO'
          ? oficialesCarrito.filter((it) => it.id === promo.producto_id)
          : oficialesCarrito;
        afectados.forEach((it) => {
          const subtotal = it.precio * it.cantidad;
          const prev = descuentosPorItem[it.clave] || 0;
          const base = Math.max(0, subtotal - prev);
          descuentosPorItem[it.clave] = prev + base * (pct / 100);
        });
      }
    });
  }
  const descuentoTotalCarrito = Object.values(descuentosPorItem).reduce((a, d) => a + d, 0);
  const totalCarritoConDescuento = Math.max(0, totalCarrito - descuentoTotalCarrito);

  function cambiarCantidadItem(idx, delta) {
    setCarrito((prev) => {
      const copia = [...prev];
      const it = { ...copia[idx] };
      if (delta > 0) it.cantidad = Math.min(it.stockMax, it.cantidad + 1);
      else it.cantidad -= 1;
      if (it.cantidad <= 0) { copia.splice(idx, 1); return copia; }
      copia[idx] = it;
      return copia;
    });
  }
  function quitarItem(idx) { setCarrito((prev) => prev.filter((_, i) => i !== idx)); }

  function calcularGrupos() {
    const map = {};
    carrito.forEach((it) => {
      const k = it.vendedorId;
      if (!map[k]) map[k] = { vendorId: k, nombre: it.vendedorNombre, alias: it.vendedorAlias || '-', cbu: it.vendedorCBU || '-', monto: 0 };
      map[k].monto += it.precio * it.cantidad;
    });
    return Object.values(map);
  }

  function irCheckout() {
    if (!carrito.length) return;
    setCarritoAbierto(false);
    setErrorCheckout('');
    setComprobantes({});
    setPaso(1);
    setCodigoPromo('');
    setPromoValidada(null);
    setErrorPromo('');
    setCheckoutAbierto(true);
  }

  function onSubmitDatos(e) {
    e.preventDefault();
    if (honeypot) return;
    setErrorCheckout('');
    setGrupos(calcularGrupos());
    setPaso(2);
    validarCodigoPromo();
  }

  async function onComprobanteChange(vendorId, file) {
    if (!file) {
      setComprobantes((c) => { const n = { ...c }; delete n[vendorId]; return n; });
      return;
    }
    setComprobantes((c) => ({ ...c, [vendorId]: { nombreArchivo: file.name, subiendo: true } }));
    try {
      const path = await subirComprobanteDirecto(file, vendorId, honeypot);
      setComprobantes((c) => ({ ...c, [vendorId]: { nombreArchivo: file.name, path } }));
    } catch (err) {
      setComprobantes((c) => ({ ...c, [vendorId]: { nombreArchivo: file.name, error: err.message } }));
    }
  }

  async function validarCodigoPromo() {
    setErrorPromo('');
    setValidandoPromo(true);
    try {
      const res = await fetch('/api/promos/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: codigoPromo,
          items: carrito.map((it) => ({ id: it.id, tipo: it.tipo, talle: it.talle, color: it.color, cantidad: it.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.mensaje || 'Código inválido.');
      setPromoValidada(data);
    } catch (err) {
      setPromoValidada(null);
      setErrorPromo(err.message);
    } finally {
      setValidandoPromo(false);
    }
  }

  async function finalizarCompra() {
    if (Object.values(comprobantes).some((c) => c && c.subiendo)) {
      setErrorCheckout('Esperá a que termine de subirse el comprobante.');
      return;
    }
    setEnviando(true);
    setErrorCheckout('');
    try {
      const payload = {
        ...datosComprador,
        tcf_hp: honeypot,
        codigoPromo: codigoPromo.trim() || null,
        items: carrito.map((it) => ({ id: it.id, tipo: it.tipo, talle: it.talle, color: it.color, cantidad: it.cantidad })),
        pagos: grupos.map((g) => ({ vendorId: g.vendorId, comprobantePath: comprobantes[g.vendorId]?.path || null })),
      };
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let huboJson = true;
      const data = await res.json().catch(() => { huboJson = false; return {}; });
      if (!huboJson && !res.ok) {
        throw new Error('Hubo un problema de conexión. Probá de nuevo.');
      }
      if (!res.ok || !data.ok) throw new Error(data.mensaje || 'No se pudo procesar. Probá de nuevo.');
      setResultadoFinal(data);
      setPaso(3);
      setCarrito([]);
      setComprobantes({});
      setCodigoPromo('');
      setPromoValidada(null);
    } catch (err) {
      setErrorCheckout(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function volverATienda() {
    setCheckoutAbierto(false);
    recargarCatalogo();
  }

  const vendedorDrawerData = datos && vendorDrawer
    ? (datos.vendedores || []).find((v) => v.vendorId === vendorDrawer)
    : null;

  const imagenesModal = (productoActual && productoActual.imagenes) || [];
  function irSlide(n) {
    const total = imagenesModal.length;
    if (!total) return;
    setCarouselIdx(Math.max(0, Math.min(n, total - 1)));
  }
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) irSlide(carouselIdx + (diff > 0 ? 1 : -1));
  }

  const nombreTienda = config.NombreTienda || 'Tienda Oficial';

  const gruposConDescuento = grupos.map((g) => {
    if (g.vendorId === 'CLUB' && promoValidada && promoValidada.descuentoTotal > 0) {
      return { ...g, monto: Math.max(0, g.monto - promoValidada.descuentoTotal) };
    }
    return g;
  });

  return (
    <>
      <SiteNav />
      <header className="tcf-header">
        <div>
          <h1>{nombreTienda}</h1>
          <p className="tcf-subtitle">Proyecto de portafolio · Versión demo</p>
        </div>
        <button className="tcf-btn-carrito" type="button" aria-label="Carrito de compras" onClick={() => setCarritoAbierto(true)}>
          🛒 <span id="contadorCarrito">{totalItems}</span>
        </button>
      </header>

      <section className="tcf-hero">
        <h2>Vestite de azul y blanco</h2>
        <p>Productos oficiales y de nuestros socios. Pagás por transferencia y coordinamos la entrega.</p>
      </section>

      <main>
        <section className="tcf-seccion">
          <h2 className="tcf-titulo-seccion">Productos Oficiales</h2>
          {cargando ? (
            <div className="tcf-grilla-skeleton">
              <div className="tcf-skeleton tcf-skeleton-card"></div>
              <div className="tcf-skeleton tcf-skeleton-card"></div>
              <div className="tcf-skeleton tcf-skeleton-card"></div>
              <div className="tcf-skeleton tcf-skeleton-card"></div>
            </div>
          ) : (datos?.oficiales || []).length === 0 ? (
            <p className="tcf-vacio">Todavía no hay productos oficiales cargados.</p>
          ) : (
            <div className="tcf-grilla">
              {datos.oficiales.map((p) => <ProductCard key={p.id} p={p} onClick={abrirModalProducto} />)}
            </div>
          )}
        </section>

        <hr className="tcf-divider" />

        <section className="tcf-seccion tcf-seccion-socios">
          <h2 className="tcf-titulo-seccion">Productos de Nuestros Socios</h2>
          {cargando ? (
            <div className="tcf-strip-skeleton">
              <div className="tcf-skeleton tcf-skeleton-vendor"></div>
              <div className="tcf-skeleton tcf-skeleton-vendor"></div>
              <div className="tcf-skeleton tcf-skeleton-vendor"></div>
            </div>
          ) : (datos?.vendedores || []).length === 0 ? (
            <p className="tcf-vacio">Todavía no hay productos de socios publicados.</p>
          ) : (
            <div className="tcf-vendor-strip">
              {datos.vendedores.map((v) => <VendorCard key={v.vendorId} v={v} onClick={setVendorDrawer} />)}
            </div>
          )}
        </section>

        <hr className="tcf-divider" />

        <section className="tcf-seccion tcf-seccion-servicios">
          <h2 className="tcf-titulo-seccion">Servicios de Nuestros Socios</h2>
          {cargando ? (
            <div className="tcf-strip-skeleton">
              <div className="tcf-skeleton tcf-skeleton-vendor"></div>
              <div className="tcf-skeleton tcf-skeleton-vendor"></div>
              <div className="tcf-skeleton tcf-skeleton-vendor"></div>
            </div>
          ) : (datos?.servicios || []).length === 0 ? (
            <p className="tcf-vacio">Todavía no hay servicios de socios publicados.</p>
          ) : (
            <div className="tcf-strip-wrap">
              <div className="tcf-servicios-strip">
                {datos.servicios.map((s) => <ServiceCard key={s.id} s={s} onClick={abrirModalServicio} />)}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>Tienda Demo · Proyecto de portafolio</p>
        {config.WhatsAppContacto && (
          <p><a href={`https://wa.me/${config.WhatsAppContacto}`} target="_blank" rel="noopener noreferrer">¿Dudas? Escribinos por WhatsApp</a></p>
        )}
      </footer>

      {vendorDrawer && (
        <div className="tcf-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setVendorDrawer(null); }}>
          <div className="tcf-drawer-panel" role="dialog" aria-modal="true">
            <div className="tcf-drawer-header">
              <div className="tcf-drawer-header-txt">
                <p>Tienda de socio</p>
                <h3>{vendedorDrawerData?.nombre}</h3>
              </div>
              <button className="tcf-drawer-cerrar" type="button" aria-label="Cerrar" onClick={() => setVendorDrawer(null)}>✕</button>
            </div>
            <div className="tcf-drawer-scroll">
              <div className="tcf-grilla-drawer">
                {(vendedorDrawerData?.productos || []).map((p) => (
                  <ProductCard key={p.id} p={p} onClick={(prod) => { setVendorDrawer(null); abrirModalProducto(prod); }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {productoActual && (
        <div className="tcf-overlay tcf-centrado">
          <div className="tcf-modal-contenido" role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="tcf-cerrar" type="button" aria-label="Cerrar" onClick={cerrarModalProducto}>✕</button>
            </div>
            <div className="tcf-carousel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div className="tcf-carousel-track" style={{ transform: `translateX(-${carouselIdx * 100}%)` }}>
                {(imagenesModal.length ? imagenesModal : [IMG_PH]).map((src, i) => (
                  <div className="tcf-carousel-slide" key={i}>
                    <img src={src} alt="" onError={(e) => { e.target.src = IMG_PH; }} />
                  </div>
                ))}
              </div>
              {imagenesModal.length > 1 && (
                <>
                  <button className="tcf-carousel-btn tcf-carousel-prev" type="button" style={{ visibility: carouselIdx === 0 ? 'hidden' : 'visible' }} onClick={() => irSlide(carouselIdx - 1)}>‹</button>
                  <button className="tcf-carousel-btn tcf-carousel-next" type="button" style={{ visibility: carouselIdx === imagenesModal.length - 1 ? 'hidden' : 'visible' }} onClick={() => irSlide(carouselIdx + 1)}>›</button>
                  <div className="tcf-carousel-dots">
                    {imagenesModal.map((_, i) => (
                      <button key={i} className={'tcf-dot' + (i === carouselIdx ? ' tcf-dot-activo' : '')} type="button" onClick={() => irSlide(i)} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <h3 className="tcf-titulo-modal">{productoActual.nombre}</h3>
            <p className="tcf-item-vendedor">{productoActual.tipo === 'socio' ? 'Vendido por ' + productoActual.vendedorNombre : ''}</p>
            <p style={{ color: '#4a5568', fontSize: 13.5, margin: '0 0 10px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{productoActual.descripcion || ''}</p>
            {(() => {
              const promoModal = productoActual.tipo === 'oficial' ? productoActual.promo : null;
              if (promoModal && promoModal.tipo === 'PORCENTAJE') {
                return (
                  <p style={{ margin: '0 0 14px' }}>
                    <span className="tcf-precio-tachado" style={{ fontSize: 15 }}>${fmt(productoActual.precio)}</span>{' '}
                    <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--color-primario)' }}>${fmt(promoModal.precioConDescuento)}</span>{' '}
                    <span className="tcf-badge-promo" style={{ position: 'static', marginLeft: 4 }}>-{promoModal.valor}%</span>
                  </p>
                );
              }
              if (promoModal && promoModal.tipo === '2X1') {
                return (
                  <p style={{ margin: '0 0 14px' }}>
                    <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--color-primario)' }}>${fmt(productoActual.precio)}</span>{' '}
                    <span className="tcf-badge-promo" style={{ position: 'static', marginLeft: 4 }}>2x1</span>
                    <br /><span className="tcf-nota-2x1">Llevando 2 unidades (aunque sean de distinto talle/color), el 2do sale gratis.</span>
                  </p>
                );
              }
              if (promoModal && promoModal.tipo === 'NXPRECIO') {
                return (
                  <p style={{ margin: '0 0 14px' }}>
                    <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--color-primario)' }}>${fmt(productoActual.precio)}</span>{' '}
                    <span className="tcf-badge-promo" style={{ position: 'static', marginLeft: 4 }}>{promoModal.cantidad}x${fmt(promoModal.valor)}</span>
                    <br /><span className="tcf-nota-2x1">Llevando {promoModal.cantidad} unidades (aunque sean de distinto talle/color), pagás ${fmt(promoModal.valor)} en total.</span>
                  </p>
                );
              }
              return <p style={{ fontSize: 21, fontWeight: 800, color: 'var(--color-primario)', margin: '0 0 14px' }}>${fmt(productoActual.precio)}</p>;
            })()}

            {productoActual.talles && productoActual.talles.length > 0 && (
              <div className="tcf-grupo-opciones">
                <label>Talle</label>
                <div className="tcf-opciones">
                  {productoActual.talles.map((t) => (
                    <button key={t} type="button" className={'tcf-opcion' + (sel.talle === t ? ' tcf-opcion-activa' : '')} onClick={() => elegirOpcion('talle', t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            {productoActual.colores && productoActual.colores.length > 0 && (
              <div className="tcf-grupo-opciones">
                <label>Color</label>
                <div className="tcf-opciones">
                  {productoActual.colores.map((c) => (
                    <button key={c} type="button" className={'tcf-opcion' + (sel.color === c ? ' tcf-opcion-activa' : '')} onClick={() => elegirOpcion('color', c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="tcf-grupo-opciones">
              <label>Cantidad</label>
              <div className="tcf-cantidad">
                <button type="button" onClick={() => cambiarCantidad(-1)}>−</button>
                <span>{sel.cantidad}</span>
                <button type="button" onClick={() => cambiarCantidad(1)}>+</button>
              </div>
              {(() => {
                const stock = stockDisponible(productoActual, sel);
                const cls = stock <= 0 ? 'tcf-stock-cero' : stock <= 3 ? 'tcf-stock-bajo' : 'tcf-stock-ok';
                const msg = stock <= 0 ? 'Sin stock para esta combinación' : stock <= 3 ? `¡Últimas ${stock} unidades!` : `${stock} disponibles`;
                return <p className={'tcf-stock-variante ' + cls}>{msg}</p>;
              })()}
            </div>
            <button
              className="tcf-btn-primario"
              type="button"
              disabled={stockDisponible(productoActual, sel) <= 0}
              onClick={agregarAlCarrito}
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {servicioActual && (
        <div className="tcf-overlay tcf-centrado">
          <div className="tcf-modal-contenido" role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="tcf-cerrar" type="button" aria-label="Cerrar" onClick={cerrarModalServicio}>✕</button>
            </div>
            <img
              src={(servicioActual.imagenes && servicioActual.imagenes[0]) || IMG_PH}
              alt=""
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12, marginBottom: 14, background: '#e8ebf4' }}
              onError={(e) => { e.target.src = IMG_PH; }}
            />
            <h3 className="tcf-titulo-modal">{servicioActual.rubro}</h3>
            <p className="tcf-item-vendedor">Ofrecido por {servicioActual.vendedorNombre}</p>
            <p style={{ color: '#4a5568', fontSize: 13.5, margin: '0 0 12px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{servicioActual.descripcion || ''}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {servicioActual.disponible
                ? <span className="tcf-badge tcf-badge-disponible">Disponible</span>
                : <span className="tcf-badge tcf-badge-no-disponible">No disponible</span>}
              {servicioActual.fullTime && <span className="tcf-badge" style={{ background: '#e8f0ff', color: 'var(--color-acento)' }}>Full time</span>}
              {servicioActual.urgencias && <span className="tcf-badge tcf-badge-urgencias">Atiende urgencias</span>}
            </div>
            <p style={{ fontSize: 13, margin: '4px 0' }}><strong>Zona:</strong> {servicioActual.zonaCobertura || '-'}</p>
            <p style={{ fontSize: 13, margin: '4px 0' }}><strong>Horario:</strong> {servicioActual.horarioAtencion || '-'}</p>
            <p style={{ fontSize: 13, margin: '4px 0 16px' }}><strong>Días:</strong> {servicioActual.dias || (servicioActual.fullTime ? 'Full time' : '-')}</p>
            {servicioActual.vendedorTelefono && (
              <a
                className="tcf-btn-primario"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/549${String(servicioActual.vendedorTelefono).replace(/\D/g, '')}`}
              >
                📲 Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {carritoAbierto && (
        <div className="tcf-overlay">
          <div className="tcf-panel-contenido" role="dialog" aria-modal="true">
            <div className="tcf-panel-header">
              <h3>Tu carrito</h3>
              <button className="tcf-cerrar" type="button" aria-label="Cerrar" onClick={() => setCarritoAbierto(false)}>✕</button>
            </div>
            <div className="tcf-panel-scroll">
              {carrito.length === 0 ? (
                <p className="tcf-vacio" style={{ paddingTop: 16 }}>Todavía no agregaste productos.</p>
              ) : (
                <div>
                  {carrito.map((it, idx) => {
                    const meta = [it.talle, it.color].filter(Boolean).join(' · ');
                    const descuentoLinea = descuentosPorItem[it.clave] || 0;
                    return (
                      <div className="tcf-item-carrito" key={it.clave}>
                        <img src={it.imagen || IMG_PH} alt="" onError={(e) => { e.target.src = IMG_PH; }} />
                        <div className="tcf-item-info">
                          <p><strong>{it.nombre}</strong></p>
                          {meta && <p className="tcf-item-meta">{meta}</p>}
                          {descuentoLinea > 0 ? (
                            <p className="tcf-item-meta">
                              <span className="tcf-precio-tachado">${fmt(it.precio)}</span>{' '}
                              ${fmt(Math.max(0, it.precio * it.cantidad - descuentoLinea) / it.cantidad)} c/u 🎉
                            </p>
                          ) : (
                            <p className="tcf-item-meta">${fmt(it.precio)} c/u</p>
                          )}
                          <div className="tcf-item-acciones">
                            <button type="button" onClick={() => cambiarCantidadItem(idx, -1)}>−</button>
                            <span>{it.cantidad}</span>
                            <button type="button" onClick={() => cambiarCantidadItem(idx, 1)}>+</button>
                            <button type="button" className="tcf-quitar" title="Quitar" aria-label="Quitar del carrito" onClick={() => quitarItem(idx)}>✕</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="tcf-carrito-total">
                    <span>Total</span>
                    {descuentoTotalCarrito > 0 ? (
                      <span>
                        <span className="tcf-precio-tachado" style={{ fontSize: 14, marginRight: 6 }}>${fmt(totalCarrito)}</span>
                        ${fmt(totalCarritoConDescuento)}
                      </span>
                    ) : (
                      <span>${fmt(totalCarrito)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="tcf-panel-footer">
              {carrito.length > 0 && <button className="tcf-btn-primario" type="button" onClick={irCheckout}>Continuar compra</button>}
              <button className="tcf-btn-secundario" type="button" onClick={() => setCarritoAbierto(false)}>Seguir comprando</button>
            </div>
          </div>
        </div>
      )}

      {checkoutAbierto && (
        <div className="tcf-overlay tcf-centrado">
          <div className="tcf-modal-contenido" role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="tcf-pasos" style={{ flex: 1, margin: '0 12px 0 0' }}>
                <div className={'tcf-paso-dot' + (paso >= 1 ? ' tcf-paso-activo' : '')}></div>
                <div className={'tcf-paso-dot' + (paso >= 2 ? ' tcf-paso-activo' : '')}></div>
                <div className={'tcf-paso-dot' + (paso >= 3 ? ' tcf-paso-activo' : '')}></div>
              </div>
              <button className="tcf-cerrar" type="button" aria-label="Cerrar" onClick={() => setCheckoutAbierto(false)}>✕</button>
            </div>

            {paso === 1 && (
              <div>
                <h3 className="tcf-titulo-modal" style={{ marginBottom: 16 }}>Tus datos</h3>
                <form onSubmit={onSubmitDatos}>
                  <div className="tcf-campo">
                    <label>Nombre y apellido</label>
                    <input type="text" required value={datosComprador.nombre} onChange={(e) => setDatosComprador({ ...datosComprador, nombre: e.target.value })} />
                  </div>
                  <div className="tcf-campo">
                    <label>DNI</label>
                    <input type="text" inputMode="numeric" required value={datosComprador.dni} onChange={(e) => setDatosComprador({ ...datosComprador, dni: e.target.value })} />
                  </div>
                  <div className="tcf-campo">
                    <label>Teléfono</label>
                    <input type="tel" required value={datosComprador.telefono} onChange={(e) => setDatosComprador({ ...datosComprador, telefono: e.target.value })} />
                  </div>
                  <div className="tcf-campo">
                    <label>Dirección de entrega</label>
                    <input type="text" required value={datosComprador.direccion} onChange={(e) => setDatosComprador({ ...datosComprador, direccion: e.target.value })} />
                  </div>
                  <div className="tcf-campo">
                    <label>Correo electrónico</label>
                    <input type="email" required value={datosComprador.email} onChange={(e) => setDatosComprador({ ...datosComprador, email: e.target.value })} />
                  </div>
                  <div className="tcf-hp">
                    <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                  </div>
                  <button className="tcf-btn-primario" type="submit">Continuar</button>
                </form>
              </div>
            )}

            {paso === 2 && (
              <div>
                <h3 className="tcf-titulo-modal" style={{ marginBottom: 14 }}>Pagá por transferencia</h3>

                <div className="tcf-campo">
                  <label>¿Tenés un código de descuento?</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text" placeholder="Opcional" value={codigoPromo}
                      onChange={(e) => setCodigoPromo(e.target.value.toUpperCase())}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="tcf-btn-secundario" style={{ width: 'auto', margin: 0, padding: '0 16px' }} disabled={validandoPromo} onClick={validarCodigoPromo}>
                      {validandoPromo ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {errorPromo && <p className="tcf-error">{errorPromo}</p>}
                  {promoValidada && promoValidada.descuentoTotal > 0 && (
                    <p style={{ color: '#1e6b3a', fontSize: 13, marginTop: 6 }}>
                      🎉 Descuento aplicado: -${fmt(promoValidada.descuentoTotal)} (solo sobre productos oficiales)
                    </p>
                  )}
                </div>

                <div>
                  {gruposConDescuento.map((g) => {
                    const esClub = g.vendorId === 'CLUB';
                    return (
                      <div className="tcf-caja-pago" key={g.vendorId}>
                        <p className="tcf-caja-pago-nombre">{g.nombre}{esClub ? '' : ' · Socio vendedor'}</p>
                        <p>Monto</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primario)', margin: '2px 0 8px' }}>${fmt(g.monto)}</p>
                        <p>Alias</p>
                        <p className="tcf-alias">{g.alias}</p>
                        <button
                          type="button" className="tcf-btn-copiar"
                          onClick={(e) => {
                            if (navigator.clipboard) navigator.clipboard.writeText(g.alias);
                            const btn = e.target; const orig = btn.textContent;
                            btn.textContent = '¡Copiado!';
                            setTimeout(() => { btn.textContent = orig; }, 1500);
                          }}
                        >
                          Copiar alias
                        </button>
                        <p style={{ marginTop: 8, fontSize: 12.5 }}>CBU/CVU: {g.cbu}</p>
                        <div className="tcf-campo" style={{ marginTop: 10 }}>
                          <label>Comprobante de esta transferencia</label>
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => onComprobanteChange(g.vendorId, e.target.files[0])} />
                          <EstadoComprobante c={comprobantes[g.vendorId]} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {errorCheckout && <p className="tcf-error">{errorCheckout}</p>}
                <button
                  className="tcf-btn-primario" type="button"
                  disabled={enviando || Object.values(comprobantes).some((c) => c && c.subiendo)}
                  onClick={finalizarCompra}
                >
                  {enviando ? 'Procesando...' : 'Finalizar compra'}
                </button>
                <button className="tcf-btn-secundario" type="button" onClick={() => setPaso(1)}>Volver</button>
              </div>
            )}

            {paso === 3 && resultadoFinal && (
              <div>
                <div className="tcf-exito">
                  <div className="tcf-icon">✅</div>
                  <h3>¡Compra exitosa!</h3>
                  <p>Pedido <strong>{resultadoFinal.idPedido}</strong></p>
                  <p>La tienda se va a comunicar con vos para coordinar la entrega. Te enviamos un resumen a tu correo.</p>
                </div>
                <div>
                  {(resultadoFinal.grupos || []).map((g) => {
                    if (g.esSocio && !g.comprobanteRecibido && g.telefono) {
                      return <div className="tcf-aviso-wa" key={g.vendorId}>📲 Enviá el comprobante de <strong>{g.nombre}</strong> por WhatsApp a: <strong>{g.telefono}</strong></div>;
                    }
                    if (!g.esSocio && !g.comprobanteRecibido && config.WhatsAppContacto) {
                      return <div className="tcf-aviso-wa" key={g.vendorId}>⚠️ No recibimos el comprobante de la Tienda Oficial. Enviálo por WhatsApp a: <strong>{config.WhatsAppContacto}</strong></div>;
                    }
                    return null;
                  })}
                </div>
                <button className="tcf-btn-primario" type="button" onClick={volverATienda}>Volver a la tienda</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
