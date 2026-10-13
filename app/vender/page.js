'use client';

import { useState, useEffect } from 'react';
import SiteNav from '@/components/SiteNav';
import { subirImagenDirecta } from '@/lib/subirImagenDirecta';

async function api(path, options = {}) {
  const metodo = (options.method || 'GET').toUpperCase();
  const url = metodo === 'GET' ? path + (path.includes('?') ? '&' : '?') + '_=' + Date.now() : path;
  const res = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let huboJson = true;
  const data = await res.json().catch(() => { huboJson = false; return {}; });
  if (!huboJson && !res.ok) {
    throw new Error('El envío es muy pesado (probá con imágenes más livianas, menos de 5 MB cada una) o hubo un problema de conexión.');
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.mensaje || 'Ocurrió un error. Probá de nuevo.');
  }
  return data;
}

function EstadoImagen({ img, style }) {
  if (!img) return null;
  if (img.subiendo) return <p style={{ fontSize: 12.5, color: '#64748b', ...style }}>⏳ Subiendo "{img.nombreArchivo}"...</p>;
  if (img.error) return <p style={{ fontSize: 12.5, color: '#b91c1c', ...style }}>❌ {img.nombreArchivo}: {img.error}</p>;
  return <p style={{ fontSize: 12.5, color: '#1e6b3a', ...style }}>📎 {img.nombreArchivo}</p>;
}

function VariantesProducto({ producto, onGuardado }) {
  const [abierta, setAbierta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [filas, setFilas] = useState([]);
  const [aviso, setAviso] = useState({ texto: '', color: '' });
  const [guardando, setGuardando] = useState(false);

  const talles = (producto.talles || '').split(',').map((s) => s.trim()).filter(Boolean);
  const colores = (producto.colores || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!talles.length && !colores.length) return null;

  const hayTalle = talles.length > 0;
  const hayColor = colores.length > 0;
  const label = hayTalle && hayColor ? 'Stock por talle y color' : hayTalle ? 'Stock por talle' : 'Stock por color';

  async function abrir() {
    const nuevoEstado = !abierta;
    setAbierta(nuevoEstado);
    if (!nuevoEstado || filas.length) return;
    setCargando(true);
    try {
      const variantesServidor = await api(`/api/vender/productos/${producto.id}/variantes`);
      const stockMap = {};
      (variantesServidor || []).forEach((v) => { stockMap[`${v.talle}|${v.color}`] = v.stock; });

      const combinaciones = [];
      if (hayTalle && hayColor) talles.forEach((t) => colores.forEach((c) => combinaciones.push({ talle: t, color: c })));
      else if (hayTalle) talles.forEach((t) => combinaciones.push({ talle: t, color: '' }));
      else colores.forEach((c) => combinaciones.push({ talle: '', color: c }));

      setFilas(combinaciones.map((combo) => ({
        ...combo,
        stock: stockMap.hasOwnProperty(`${combo.talle}|${combo.color}`) ? stockMap[`${combo.talle}|${combo.color}`] : 0,
      })));
    } catch (e) {
      setAviso({ texto: e.message, color: '#c0392b' });
    } finally {
      setCargando(false);
    }
  }

  function cambiarStockFila(idx, valor) {
    setFilas((prev) => {
      const copia = [...prev];
      copia[idx] = { ...copia[idx], stock: valor };
      return copia;
    });
  }

  async function guardar() {
    const invalido = filas.some((f) => isNaN(Number(f.stock)) || Number(f.stock) < 0);
    if (invalido) { setAviso({ texto: 'Revisá los valores de stock.', color: '#c0392b' }); return; }
    setGuardando(true);
    setAviso({ texto: '', color: '' });
    try {
      const resp = await api(`/api/vender/productos/${producto.id}/variantes`, {
        method: 'PUT',
        body: JSON.stringify({ variantes: filas.map((f) => ({ talle: f.talle, color: f.color, stock: Number(f.stock) })) }),
      });
      setAviso({ texto: `✅ Stock guardado. Total: ${resp.totalStock}`, color: '#1e6b3a' });
      if (onGuardado) onGuardado(resp.totalStock);
    } catch (e) {
      setAviso({ texto: e.message, color: '#c0392b' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="vp-variantes-wrap">
      <button type="button" className="vp-variantes-toggle" onClick={abrir}>
        {abierta ? '▼' : '▶'} {label}
      </button>
      <table className={'vp-variantes-tabla' + (abierta ? ' vp-variantes-abierta' : '')}>
        <thead>
          <tr>
            {hayTalle && <th>Talle</th>}
            {hayColor && <th>Color</th>}
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr><td colSpan={3} style={{ color: '#94a3b8', fontSize: 12, padding: '8px 0' }}>Cargando...</td></tr>
          ) : (
            filas.map((f, idx) => (
              <tr key={idx}>
                {hayTalle && <td>{f.talle}</td>}
                {hayColor && <td>{f.color}</td>}
                <td><input type="number" min="0" step="1" value={f.stock} onChange={(e) => cambiarStockFila(idx, e.target.value)} /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {aviso.texto && <p className="vp-variantes-aviso" style={{ color: aviso.color }}>{aviso.texto}</p>}
      {abierta && (
        <button type="button" className="vp-btn-guardar-variantes" disabled={guardando} onClick={guardar}>
          {guardando ? 'Guardando...' : 'Guardar stock por variante'}
        </button>
      )}
    </div>
  );
}

export default function VenderPage() {
  const [sesion, setSesion] = useState(null);
  const [dni, setDni] = useState('');
  const [clave, setClave] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [ingresando, setIngresando] = useState(false);

  const [tab, setTab] = useState('cargar');

  const [formProducto, setFormProducto] = useState({ nombreProducto: '', descripcion: '', precio: '', stock: '', talles: '', colores: '', usaVariantes: false });
  const [imagenesProducto, setImagenesProducto] = useState([null, null]);
  const [errorProducto, setErrorProducto] = useState('');
  const [exitoProducto, setExitoProducto] = useState(false);
  const [enviandoProducto, setEnviandoProducto] = useState(false);

  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [errorMisProductos, setErrorMisProductos] = useState('');
  const [stockLocal, setStockLocal] = useState({});

  const [editProducto, setEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});
  const [imagenesEditProducto, setImagenesEditProducto] = useState([null, null]);
  const [errorEditProducto, setErrorEditProducto] = useState('');
  const [avisoEditProducto, setAvisoEditProducto] = useState('');
  const [guardandoEditProducto, setGuardandoEditProducto] = useState(false);

  const [formServicio, setFormServicio] = useState({ rubro: '', descripcion: '', zonaCobertura: '', horarioAtencion: '', dias: '', fullTime: false, urgencias: false });
  const [imagenesServicio, setImagenesServicio] = useState([null, null]);
  const [errorServicio, setErrorServicio] = useState('');
  const [exitoServicio, setExitoServicio] = useState(false);
  const [enviandoServicio, setEnviandoServicio] = useState(false);

  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [errorMisServicios, setErrorMisServicios] = useState('');

  const [editServicio, setEditServicio] = useState(null);
  const [formEditServicio, setFormEditServicio] = useState({});
  const [imagenesEditServicio, setImagenesEditServicio] = useState([null, null]);
  const [errorEditServicio, setErrorEditServicio] = useState('');
  const [avisoEditServicio, setAvisoEditServicio] = useState('');
  const [guardandoEditServicio, setGuardandoEditServicio] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api('/api/vender/session');
        if (resp.ok) {
          setSesion({ nombre: resp.nombre, tipo: resp.tipo || 'Producto' });
          setTab(resp.tipo === 'Servicio' ? 'cargarServicio' : 'cargar');
        }
      } catch (e) {
      }
    })();
  }, []);

  async function onSubmitLogin(e) {
    e.preventDefault();
    setErrorLogin('');
    setIngresando(true);
    try {
      const resp = await api('/api/vender/login', { method: 'POST', body: JSON.stringify({ dni, clave }) });
      if (!resp.ok) { setErrorLogin(resp.mensaje); return; }
      setSesion({ nombre: resp.nombre, tipo: resp.tipo || 'Producto' });
      setTab(resp.tipo === 'Servicio' ? 'cargarServicio' : 'cargar');
    } catch (err) {
      setErrorLogin(err.message);
    } finally {
      setIngresando(false);
    }
  }

  async function cerrarSesion() {
    try { await fetch('/api/vender/logout', { method: 'POST' }); } catch (e) { }
    setSesion(null);
    setDni(''); setClave('');
    setProductos([]); setServicios([]);
    setFormProducto({ nombreProducto: '', descripcion: '', precio: '', stock: '', talles: '', colores: '' });
    setFormServicio({ rubro: '', descripcion: '', zonaCobertura: '', horarioAtencion: '', dias: '', fullTime: false, urgencias: false });
  }

  function cambiarTab(nuevaTab) {
    setTab(nuevaTab);
    if (nuevaTab === 'mis') cargarMisProductos();
    if (nuevaTab === 'misServicios') cargarMisServicios();
    if (nuevaTab === 'misVentas') cargarMisVentas();
  }

  const [misVentas, setMisVentas] = useState([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [errorMisVentas, setErrorMisVentas] = useState('');

  async function cargarMisVentas() {
    setCargandoVentas(true);
    setErrorMisVentas('');
    try {
      setMisVentas(await api('/api/vender/pedidos'));
    } catch (err) {
      setErrorMisVentas(err.message);
    } finally {
      setCargandoVentas(false);
    }
  }

  async function verMiComprobante(path) {
    try {
      const resp = await api(`/api/vender/comprobante?path=${encodeURIComponent(path)}`);
      window.open(resp.url, '_blank');
    } catch (err) {
      alert(err.message);
    }
  }

  async function onImagenProducto(idx, file) {
    if (!file) { setImagenesProducto((p) => { const n = [...p]; n[idx] = null; return n; }); return; }
    setImagenesProducto((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, subiendo: true }; return n; });
    try {
      const url = await subirImagenDirecta(file, 'producto', '/api/vender/upload-url');
      setImagenesProducto((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, url }; return n; });
    } catch (err) {
      setImagenesProducto((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, error: err.message }; return n; });
    }
  }

  async function onSubmitProducto(e) {
    e.preventDefault();
    setErrorProducto('');
    setExitoProducto(false);
    if (imagenesProducto.some((i) => i && i.subiendo)) { setErrorProducto('Esperá a que terminen de subirse las fotos.'); return; }
    setEnviandoProducto(true);
    try {
      await api('/api/vender/productos', {
        method: 'POST',
        body: JSON.stringify({ ...formProducto, imagenes: imagenesProducto.filter(Boolean).map((i) => i.url).filter(Boolean), tcf_hp: '' }),
      });
      setFormProducto({ nombreProducto: '', descripcion: '', precio: '', stock: '', talles: '', colores: '', usaVariantes: false });
      setImagenesProducto([null, null]);
      setExitoProducto(true);
    } catch (err) {
      setErrorProducto(err.message);
    } finally {
      setEnviandoProducto(false);
    }
  }

  async function cargarMisProductos() {
    setCargandoProductos(true);
    setErrorMisProductos('');
    try {
      const data = await api('/api/vender/productos');
      setProductos(data);
      const stockInicial = {};
      data.forEach((p) => { stockInicial[p.id] = p.stock; });
      setStockLocal(stockInicial);
    } catch (err) {
      setErrorMisProductos(err.message);
    } finally {
      setCargandoProductos(false);
    }
  }

  async function guardarStock(id) {
    try {
      await api(`/api/vender/productos/${id}`, { method: 'PATCH', body: JSON.stringify({ stock: Number(stockLocal[id]) }) });
      cargarMisProductos();
    } catch (err) {
      setErrorMisProductos(err.message);
    }
  }

  async function toggleActivoProducto(p) {
    try {
      await api(`/api/vender/productos/${p.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !p.activo }) });
      cargarMisProductos();
    } catch (err) {
      setErrorMisProductos(err.message);
    }
  }

  async function marcarDestacado(p) {
    try {
      await api(`/api/vender/productos/${p.id}`, { method: 'PATCH', body: JSON.stringify({ destacado: true }) });
      cargarMisProductos();
    } catch (err) {
      setErrorMisProductos(err.message);
    }
  }

  function abrirEditarProducto(p) {
    setEditProducto(p);
    setFormEditProducto({
      nombreProducto: p.nombre, descripcion: p.descripcion, precio: p.precio,
      stock: p.stock, talles: p.talles, colores: p.colores, usaVariantes: !!p.usaVariantes,
    });
    setImagenesEditProducto([null, null]);
    setErrorEditProducto('');
    setAvisoEditProducto('');
  }
  function cerrarEditarProducto() { setEditProducto(null); }

  async function onImagenEditProducto(idx, file) {
    if (!file) { setImagenesEditProducto((p) => { const n = [...p]; n[idx] = null; return n; }); return; }
    setImagenesEditProducto((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, subiendo: true }; return n; });
    try {
      const url = await subirImagenDirecta(file, 'producto', '/api/vender/upload-url');
      setImagenesEditProducto((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, url }; return n; });
    } catch (err) {
      setImagenesEditProducto((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, error: err.message }; return n; });
    }
  }

  async function onSubmitEditarProducto(e) {
    e.preventDefault();
    setErrorEditProducto('');
    if (imagenesEditProducto.some((i) => i && i.subiendo)) { setErrorEditProducto('Esperá a que terminen de subirse las fotos.'); return; }
    setGuardandoEditProducto(true);
    try {
      const resp = await api(`/api/vender/productos/${editProducto.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...formEditProducto, imagenes: imagenesEditProducto.filter(Boolean).map((i) => i.url).filter(Boolean), tcf_hp: '' }),
      });
      setAvisoEditProducto(resp.requiereReaprobacion
        ? '✅ Cambios guardados. Como el producto ya estaba publicado, quedó pendiente de re-aprobación por la administración.'
        : '✅ ¡Cambios guardados correctamente!');
      setTimeout(() => { cerrarEditarProducto(); cargarMisProductos(); }, 2200);
    } catch (err) {
      setErrorEditProducto(err.message);
    } finally {
      setGuardandoEditProducto(false);
    }
  }

  async function onImagenServicio(idx, file) {
    if (!file) { setImagenesServicio((p) => { const n = [...p]; n[idx] = null; return n; }); return; }
    setImagenesServicio((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, subiendo: true }; return n; });
    try {
      const url = await subirImagenDirecta(file, 'servicio', '/api/vender/upload-url');
      setImagenesServicio((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, url }; return n; });
    } catch (err) {
      setImagenesServicio((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, error: err.message }; return n; });
    }
  }

  async function onSubmitServicio(e) {
    e.preventDefault();
    setErrorServicio('');
    setExitoServicio(false);
    if (imagenesServicio.some((i) => i && i.subiendo)) { setErrorServicio('Esperá a que terminen de subirse las fotos.'); return; }
    setEnviandoServicio(true);
    try {
      await api('/api/vender/servicios', {
        method: 'POST',
        body: JSON.stringify({ ...formServicio, imagenes: imagenesServicio.filter(Boolean).map((i) => i.url).filter(Boolean), tcf_hp: '' }),
      });
      setFormServicio({ rubro: '', descripcion: '', zonaCobertura: '', horarioAtencion: '', dias: '', fullTime: false, urgencias: false });
      setImagenesServicio([null, null]);
      setExitoServicio(true);
    } catch (err) {
      setErrorServicio(err.message);
    } finally {
      setEnviandoServicio(false);
    }
  }

  async function cargarMisServicios() {
    setCargandoServicios(true);
    setErrorMisServicios('');
    try {
      const data = await api('/api/vender/servicios');
      setServicios(data);
    } catch (err) {
      setErrorMisServicios(err.message);
    } finally {
      setCargandoServicios(false);
    }
  }

  async function toggleDisponible(s) {
    try {
      await api(`/api/vender/servicios/${s.id}`, { method: 'PATCH', body: JSON.stringify({ disponible: !s.disponible }) });
      cargarMisServicios();
    } catch (err) {
      setErrorMisServicios(err.message);
    }
  }
  async function toggleActivoServicio(s) {
    try {
      await api(`/api/vender/servicios/${s.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !s.activo }) });
      cargarMisServicios();
    } catch (err) {
      setErrorMisServicios(err.message);
    }
  }

  function abrirEditarServicio(s) {
    setEditServicio(s);
    setFormEditServicio({
      rubro: s.rubro, descripcion: s.descripcion, zonaCobertura: s.zonaCobertura,
      horarioAtencion: s.horarioAtencion, dias: s.dias, fullTime: s.fullTime, urgencias: s.urgencias,
    });
    setImagenesEditServicio([null, null]);
    setErrorEditServicio('');
    setAvisoEditServicio('');
  }
  function cerrarEditarServicio() { setEditServicio(null); }

  async function onImagenEditServicio(idx, file) {
    if (!file) { setImagenesEditServicio((p) => { const n = [...p]; n[idx] = null; return n; }); return; }
    setImagenesEditServicio((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, subiendo: true }; return n; });
    try {
      const url = await subirImagenDirecta(file, 'servicio', '/api/vender/upload-url');
      setImagenesEditServicio((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, url }; return n; });
    } catch (err) {
      setImagenesEditServicio((p) => { const n = [...p]; n[idx] = { nombreArchivo: file.name, error: err.message }; return n; });
    }
  }

  async function onSubmitEditarServicio(e) {
    e.preventDefault();
    setErrorEditServicio('');
    if (imagenesEditServicio.some((i) => i && i.subiendo)) { setErrorEditServicio('Esperá a que terminen de subirse las fotos.'); return; }
    setGuardandoEditServicio(true);
    try {
      const resp = await api(`/api/vender/servicios/${editServicio.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...formEditServicio, imagenes: imagenesEditServicio.filter(Boolean).map((i) => i.url).filter(Boolean), tcf_hp: '' }),
      });
      setAvisoEditServicio(resp.requiereReaprobacion
        ? '✅ Cambios guardados. Como ya estaba publicado, quedó pendiente de re-aprobación por la administración.'
        : '✅ ¡Cambios guardados correctamente!');
      setTimeout(() => { cerrarEditarServicio(); cargarMisServicios(); }, 2200);
    } catch (err) {
      setErrorEditServicio(err.message);
    } finally {
      setGuardandoEditServicio(false);
    }
  }

  const esServicio = sesion?.tipo === 'Servicio';

  return (
    <>
      <SiteNav />
      <header className="vp-header">
        <h1>Portal de Socios</h1>
        <p>Cargá y administrá tus productos en la tienda oficial</p>
      </header>

      <div className="vp-contenedor">
        <div className="vp-card-portal">

          {!sesion && (
            <div>
              <h2>Identificate como socio</h2>
              <p className="vp-ayuda">Ingresá tu DNI y tu clave de socio.</p>
              <form onSubmit={onSubmitLogin}>
                <div className="vp-campo">
                  <label>DNI</label>
                  <input type="text" inputMode="numeric" required value={dni} onChange={(e) => setDni(e.target.value)} />
                </div>
                <div className="vp-campo">
                  <label>Clave</label>
                  <input type="password" required value={clave} onChange={(e) => setClave(e.target.value)} />
                </div>
                <button className="vp-btn-primario" type="submit" disabled={ingresando}>
                  {ingresando ? 'Ingresando...' : 'Ingresar'}
                </button>
                {errorLogin && <p className="vp-error">{errorLogin}</p>}
              </form>
            </div>
          )}

          {sesion && (
            <div>
              <div className="vp-saludo">
                <span>Hola, {sesion.nombre}</span>
                <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
              </div>

              <div className="vp-tabs">
                {!esServicio && <button className={'vp-tab' + (tab === 'cargar' ? ' vp-tab-activa' : '')} type="button" onClick={() => cambiarTab('cargar')}>Cargar producto</button>}
                {!esServicio && <button className={'vp-tab' + (tab === 'mis' ? ' vp-tab-activa' : '')} type="button" onClick={() => cambiarTab('mis')}>Mis productos</button>}
                {esServicio && <button className={'vp-tab' + (tab === 'cargarServicio' ? ' vp-tab-activa' : '')} type="button" onClick={() => cambiarTab('cargarServicio')}>Cargar servicio</button>}
                {esServicio && <button className={'vp-tab' + (tab === 'misServicios' ? ' vp-tab-activa' : '')} type="button" onClick={() => cambiarTab('misServicios')}>Mis servicios</button>}
                {!esServicio && <button className={'vp-tab' + (tab === 'misVentas' ? ' vp-tab-activa' : '')} type="button" onClick={() => cambiarTab('misVentas')}>Mis ventas</button>}
              </div>

              {tab === 'cargar' && (
                <div>
                  {exitoProducto && <p className="vp-ok">✅ ¡Producto enviado! Quedó pendiente de aprobación por la administración.</p>}
                  <form onSubmit={onSubmitProducto}>
                    <div className="vp-campo">
                      <label>Nombre del producto</label>
                      <input type="text" required value={formProducto.nombreProducto} onChange={(e) => setFormProducto({ ...formProducto, nombreProducto: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Descripción</label>
                      <textarea value={formProducto.descripcion} onChange={(e) => setFormProducto({ ...formProducto, descripcion: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Precio ($)</label>
                      <input type="number" min="1" step="0.01" required value={formProducto.precio} onChange={(e) => setFormProducto({ ...formProducto, precio: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Stock disponible</label>
                      <input type="number" min="0" step="1" required value={formProducto.stock} onChange={(e) => setFormProducto({ ...formProducto, stock: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Talles (si aplica)</label>
                      <input type="text" placeholder="Ej: S,M,L,XL" value={formProducto.talles} onChange={(e) => setFormProducto({ ...formProducto, talles: e.target.value })} />
                      <p className="vp-ayuda-campo">Separá las opciones con coma. Dejalo vacío si no aplica.</p>
                    </div>
                    <div className="vp-campo">
                      <label>Colores (si aplica)</label>
                      <input type="text" placeholder="Ej: Azul,Blanco" value={formProducto.colores} onChange={(e) => setFormProducto({ ...formProducto, colores: e.target.value })} />
                      <p className="vp-ayuda-campo">Separá las opciones con coma. Dejalo vacío si no aplica.</p>
                    </div>
                    <div className="vp-check-campo">
                      <input type="checkbox" id="checkUsaVariantesNuevo" checked={!!formProducto.usaVariantes} onChange={(e) => setFormProducto({ ...formProducto, usaVariantes: e.target.checked })} />
                      <label htmlFor="checkUsaVariantesNuevo">Controlar stock por talle/color por separado</label>
                    </div>
                    {formProducto.usaVariantes && (
                      <p className="vp-ayuda-campo" style={{ marginTop: -8, marginBottom: 12 }}>
                        Dejá el Stock disponible en 0 acá arriba: lo vas a cargar por variante después, desde "Mis productos" → Variantes.
                      </p>
                    )}
                    <div className="vp-campo">
                      <label>Foto del producto (hasta 2 imágenes)</label>
                      <input type="file" accept="image/*" style={{ marginBottom: 6 }} onChange={(e) => onImagenProducto(0, e.target.files[0])} />
                      <EstadoImagen img={imagenesProducto[0]} style={{ margin: '0 0 8px' }} />
                      <input type="file" accept="image/*" onChange={(e) => onImagenProducto(1, e.target.files[0])} />
                      <EstadoImagen img={imagenesProducto[1]} style={{ marginTop: 4 }} />
                      <p className="vp-ayuda-campo">Máx. 5 MB por imagen. La primera foto es la principal.</p>
                    </div>
                    {errorProducto && <p className="vp-error">{errorProducto}</p>}
                    <button className="vp-btn-primario" type="submit" disabled={enviandoProducto}>
                      {enviandoProducto ? 'Enviando...' : 'Enviar producto a aprobación'}
                    </button>
                  </form>
                </div>
              )}

              {tab === 'mis' && (
                <div>
                  {errorMisProductos && <p className="vp-error">{errorMisProductos}</p>}
                  {cargandoProductos ? (
                    <p className="vp-ayuda">Cargando tus productos...</p>
                  ) : productos.length === 0 ? (
                    <p className="vp-ayuda">Todavía no cargaste ningún producto.</p>
                  ) : (
                    productos.map((p) => {
                      const estado = !p.aprobado ? 'Pendiente de aprobación' : p.activo ? 'Publicado' : 'Dado de baja';
                      const claseEstado = !p.aprobado ? 'vp-estado-pendiente' : p.activo ? 'vp-estado-activo' : 'vp-estado-inactivo';
                      return (
                        <div className="vp-mi-producto" key={p.id}>
                          <div className="vp-mi-producto-header">
                            <p className="vp-mi-producto-nombre">{p.nombre}</p>
                            {p.aprobado && (
                              <button type="button" className={'vp-btn-estrella' + (p.destacado ? ' vp-estrella-activa' : '')} title={p.destacado ? 'Es tu producto destacado' : 'Marcar como destacado'} onClick={() => marcarDestacado(p)}>
                                {p.destacado ? '★' : '☆'}
                              </button>
                            )}
                          </div>
                          <p className="vp-mi-producto-meta">${Number(p.precio).toLocaleString('es-AR')} · <span className={claseEstado}>{estado}</span></p>
                          {p.aprobado && !p.destacado && <p className="vp-ayuda-destacado">☆ Marcá este producto como destacado para que aparezca primero en tu tienda</p>}
                          {p.destacado && <p className="vp-ayuda-destacado vp-destacado-info">★ Este es tu producto destacado en la tienda</p>}
                          <div className="vp-mi-producto-acciones">
                            <label>Stock</label>
                            <input type="number" min="0" step="1" value={stockLocal[p.id] ?? p.stock} onChange={(e) => setStockLocal({ ...stockLocal, [p.id]: e.target.value })} />
                            <button type="button" onClick={() => guardarStock(p.id)}>Guardar</button>
                            <button type="button" onClick={() => toggleActivoProducto(p)}>{p.activo ? 'Dar de baja' : 'Reactivar'}</button>
                            <button type="button" className="vp-btn-editar" onClick={() => abrirEditarProducto(p)}>✏️ Editar</button>
                          </div>
                          <VariantesProducto
                            producto={p}
                            onGuardado={(nuevoTotal) => {
                              setStockLocal((prev) => ({ ...prev, [p.id]: nuevoTotal }));
                              setProductos((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: nuevoTotal } : x)));
                            }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {tab === 'cargarServicio' && (
                <div>
                  {exitoServicio && <p className="vp-ok">✅ ¡Servicio enviado! Quedó pendiente de aprobación por la administración.</p>}
                  <form onSubmit={onSubmitServicio}>
                    <div className="vp-campo">
                      <label>Rubro / Oficio</label>
                      <input type="text" placeholder="Ej: Electricista, Abogado, Plomero" required value={formServicio.rubro} onChange={(e) => setFormServicio({ ...formServicio, rubro: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Descripción</label>
                      <textarea placeholder="Contá en qué consiste tu servicio" value={formServicio.descripcion} onChange={(e) => setFormServicio({ ...formServicio, descripcion: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Zona de cobertura</label>
                      <input type="text" placeholder="Ej: CABA, Zona Norte" value={formServicio.zonaCobertura} onChange={(e) => setFormServicio({ ...formServicio, zonaCobertura: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Horario de atención preferente</label>
                      <input type="text" placeholder="Ej: 9 a 18 hs" value={formServicio.horarioAtencion} onChange={(e) => setFormServicio({ ...formServicio, horarioAtencion: e.target.value })} />
                    </div>
                    <div className="vp-campo">
                      <label>Días que trabaja</label>
                      <input type="text" placeholder="Ej: Lunes a viernes" value={formServicio.dias} onChange={(e) => setFormServicio({ ...formServicio, dias: e.target.value })} />
                    </div>
                    <div className="vp-check-campo">
                      <input type="checkbox" id="checkFullTime" checked={formServicio.fullTime} onChange={(e) => setFormServicio({ ...formServicio, fullTime: e.target.checked })} />
                      <label htmlFor="checkFullTime">Atiendo full time</label>
                    </div>
                    <div className="vp-check-campo">
                      <input type="checkbox" id="checkUrgencias" checked={formServicio.urgencias} onChange={(e) => setFormServicio({ ...formServicio, urgencias: e.target.checked })} />
                      <label htmlFor="checkUrgencias">Atiendo urgencias</label>
                    </div>
                    <div className="vp-campo">
                      <label>Foto (opcional, hasta 2 imágenes)</label>
                      <input type="file" accept="image/*" style={{ marginBottom: 6 }} onChange={(e) => onImagenServicio(0, e.target.files[0])} />
                      <EstadoImagen img={imagenesServicio[0]} style={{ margin: '0 0 8px' }} />
                      <input type="file" accept="image/*" onChange={(e) => onImagenServicio(1, e.target.files[0])} />
                      <EstadoImagen img={imagenesServicio[1]} style={{ marginTop: 4 }} />
                    </div>
                    {errorServicio && <p className="vp-error">{errorServicio}</p>}
                    <button className="vp-btn-primario" type="submit" disabled={enviandoServicio}>
                      {enviandoServicio ? 'Enviando...' : 'Enviar servicio a aprobación'}
                    </button>
                  </form>
                </div>
              )}

              {tab === 'misServicios' && (
                <div>
                  {errorMisServicios && <p className="vp-error">{errorMisServicios}</p>}
                  {cargandoServicios ? (
                    <p className="vp-ayuda">Cargando tus servicios...</p>
                  ) : servicios.length === 0 ? (
                    <p className="vp-ayuda">Todavía no cargaste ningún servicio.</p>
                  ) : (
                    servicios.map((s) => {
                      const estado = !s.aprobado ? 'Pendiente de aprobación' : s.activo ? 'Publicado' : 'Dado de baja';
                      const claseEstado = !s.aprobado ? 'vp-estado-pendiente' : s.activo ? 'vp-estado-activo' : 'vp-estado-inactivo';
                      return (
                        <div className="vp-mi-producto" key={s.id}>
                          <div className="vp-mi-producto-header"><p className="vp-mi-producto-nombre">{s.rubro}</p></div>
                          <p className="vp-mi-producto-meta"><span className={claseEstado}>{estado}</span></p>
                          <div className="vp-mi-producto-acciones">
                            <button type="button" className={'vp-btn-disponible' + (s.disponible ? ' vp-disponible-activo' : '')} onClick={() => toggleDisponible(s)}>
                              {s.disponible ? '✅ Disponible' : '⏸️ No disponible'}
                            </button>
                            <button type="button" onClick={() => toggleActivoServicio(s)}>{s.activo ? 'Dar de baja' : 'Reactivar'}</button>
                            <button type="button" className="vp-btn-editar" onClick={() => abrirEditarServicio(s)}>✏️ Editar</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {tab === 'misVentas' && (
                <div>
                  {errorMisVentas && <p className="vp-error">{errorMisVentas}</p>}
                  {cargandoVentas ? (
                    <p className="vp-ayuda">Cargando tus ventas...</p>
                  ) : misVentas.length === 0 ? (
                    <p className="vp-ayuda">Todavía no tenés ventas registradas.</p>
                  ) : (
                    misVentas.map((v) => (
                      <div className="vp-mi-producto" key={v.id}>
                        <div className="vp-mi-producto-header">
                          <p className="vp-mi-producto-nombre">Pedido #{v.id}</p>
                        </div>
                        <p className="vp-mi-producto-meta">
                          {v.fecha} · ${Number(v.monto).toLocaleString('es-AR')} · <span className="vp-estado-activo">{v.estado}</span>
                        </p>
                        <p className="vp-mi-producto-meta">Comprador: {v.compradorNombre} {v.compradorTelefono ? `· ${v.compradorTelefono}` : ''}</p>
                        <div className="vp-mi-producto-acciones">
                          {v.comprobanteRecibido
                            ? <button type="button" onClick={() => verMiComprobante(v.comprobantePath)}>📎 Ver comprobante</button>
                            : <span className="vp-estado-pendiente">Sin comprobante todavía</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {editProducto && (
            <div className="vp-modal-overlay">
              <div className="vp-modal-caja">
                <div className="vp-modal-header">
                  <h3>Editar publicación</h3>
                  <button className="vp-modal-cerrar" type="button" onClick={cerrarEditarProducto}>✕</button>
                </div>
                {avisoEditProducto && <p className="vp-modal-aviso">{avisoEditProducto}</p>}
                <form onSubmit={onSubmitEditarProducto}>
                  <div className="vp-campo">
                    <label>Nombre del producto</label>
                    <input type="text" required value={formEditProducto.nombreProducto || ''} onChange={(e) => setFormEditProducto({ ...formEditProducto, nombreProducto: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Descripción</label>
                    <textarea value={formEditProducto.descripcion || ''} onChange={(e) => setFormEditProducto({ ...formEditProducto, descripcion: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Precio ($)</label>
                    <input type="number" min="1" step="0.01" required value={formEditProducto.precio || ''} onChange={(e) => setFormEditProducto({ ...formEditProducto, precio: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Stock disponible</label>
                    <input type="number" min="0" step="1" required value={formEditProducto.stock ?? ''} onChange={(e) => setFormEditProducto({ ...formEditProducto, stock: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Talles (si aplica)</label>
                    <input type="text" placeholder="Ej: S,M,L,XL" value={formEditProducto.talles || ''} onChange={(e) => setFormEditProducto({ ...formEditProducto, talles: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Colores (si aplica)</label>
                    <input type="text" placeholder="Ej: Azul,Blanco" value={formEditProducto.colores || ''} onChange={(e) => setFormEditProducto({ ...formEditProducto, colores: e.target.value })} />
                  </div>
                  <div className="vp-check-campo">
                    <input type="checkbox" id="checkUsaVariantesEdit" checked={!!formEditProducto.usaVariantes} onChange={(e) => setFormEditProducto({ ...formEditProducto, usaVariantes: e.target.checked })} />
                    <label htmlFor="checkUsaVariantesEdit">Controlar stock por talle/color por separado</label>
                  </div>
                  <p className="vp-ayuda-campo" style={{ marginTop: -8, marginBottom: 12 }}>
                    Si está tildado, el Stock de arriba tiene que coincidir con la suma de las variantes (se valida al guardar). Ajustalo desde "Variantes" en la lista de tus productos.
                  </p>
                  <div className="vp-campo">
                    <label>Reemplazar fotos (opcional — dejalo vacío para mantener las actuales)</label>
                    <input type="file" accept="image/*" style={{ marginBottom: 6 }} onChange={(e) => onImagenEditProducto(0, e.target.files[0])} />
                    <EstadoImagen img={imagenesEditProducto[0]} style={{ margin: '0 0 8px' }} />
                    <input type="file" accept="image/*" onChange={(e) => onImagenEditProducto(1, e.target.files[0])} />
                    <EstadoImagen img={imagenesEditProducto[1]} style={{ marginTop: 4 }} />
                    <p className="vp-ayuda-campo">Si reemplazás las fotos, las anteriores serán reemplazadas.</p>
                  </div>
                  {errorEditProducto && <p className="vp-error">{errorEditProducto}</p>}
                  <button className="vp-btn-primario" type="submit" disabled={guardandoEditProducto}>
                    {guardandoEditProducto ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button className="vp-btn-secundario" type="button" onClick={cerrarEditarProducto}>Cancelar</button>
                </form>
              </div>
            </div>
          )}

          {editServicio && (
            <div className="vp-modal-overlay">
              <div className="vp-modal-caja">
                <div className="vp-modal-header">
                  <h3>Editar servicio</h3>
                  <button className="vp-modal-cerrar" type="button" onClick={cerrarEditarServicio}>✕</button>
                </div>
                {avisoEditServicio && <p className="vp-modal-aviso">{avisoEditServicio}</p>}
                <form onSubmit={onSubmitEditarServicio}>
                  <div className="vp-campo">
                    <label>Rubro / Oficio</label>
                    <input type="text" required value={formEditServicio.rubro || ''} onChange={(e) => setFormEditServicio({ ...formEditServicio, rubro: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Descripción</label>
                    <textarea value={formEditServicio.descripcion || ''} onChange={(e) => setFormEditServicio({ ...formEditServicio, descripcion: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Zona de cobertura</label>
                    <input type="text" value={formEditServicio.zonaCobertura || ''} onChange={(e) => setFormEditServicio({ ...formEditServicio, zonaCobertura: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Horario de atención preferente</label>
                    <input type="text" value={formEditServicio.horarioAtencion || ''} onChange={(e) => setFormEditServicio({ ...formEditServicio, horarioAtencion: e.target.value })} />
                  </div>
                  <div className="vp-campo">
                    <label>Días que trabaja</label>
                    <input type="text" value={formEditServicio.dias || ''} onChange={(e) => setFormEditServicio({ ...formEditServicio, dias: e.target.value })} />
                  </div>
                  <div className="vp-check-campo">
                    <input type="checkbox" id="editCheckFullTime" checked={!!formEditServicio.fullTime} onChange={(e) => setFormEditServicio({ ...formEditServicio, fullTime: e.target.checked })} />
                    <label htmlFor="editCheckFullTime">Atiendo full time</label>
                  </div>
                  <div className="vp-check-campo">
                    <input type="checkbox" id="editCheckUrgencias" checked={!!formEditServicio.urgencias} onChange={(e) => setFormEditServicio({ ...formEditServicio, urgencias: e.target.checked })} />
                    <label htmlFor="editCheckUrgencias">Atiendo urgencias</label>
                  </div>
                  <div className="vp-campo">
                    <label>Reemplazar fotos (opcional — dejalo vacío para mantener las actuales)</label>
                    <input type="file" accept="image/*" style={{ marginBottom: 6 }} onChange={(e) => onImagenEditServicio(0, e.target.files[0])} />
                    <EstadoImagen img={imagenesEditServicio[0]} style={{ margin: '0 0 8px' }} />
                    <input type="file" accept="image/*" onChange={(e) => onImagenEditServicio(1, e.target.files[0])} />
                    <EstadoImagen img={imagenesEditServicio[1]} style={{ marginTop: 4 }} />
                    <p className="vp-ayuda-campo">Si subís fotos nuevas, van a reemplazar las actuales.</p>
                  </div>
                  {errorEditServicio && <p className="vp-error">{errorEditServicio}</p>}
                  <button className="vp-btn-primario" type="submit" disabled={guardandoEditServicio}>
                    {guardandoEditServicio ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button className="vp-btn-secundario" type="button" onClick={cerrarEditarServicio}>Cancelar</button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
