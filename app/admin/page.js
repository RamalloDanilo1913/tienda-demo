'use client';

import { useState, useEffect } from 'react';
import { subirImagenDirecta } from '@/lib/subirImagenDirecta';

const ESTADOS_PEDIDO = [
  'Pendiente de comprobante(s)',
  'Comprobantes recibidos',
  'En preparación',
  'En camino',
  'Entregado',
  'Cancelado',
];

function fmt(n) {
  try { return Number(n).toLocaleString('es-AR'); } catch (e) { return String(n); }
}
function parseCSV(s) {
  return s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : [];
}
async function api(path, options = {}) {
  const metodo = (options.method || 'GET').toUpperCase();
  const url = metodo === 'GET' ? path + (path.includes('?') ? '&' : '?') + '_=' + Date.now() : path;
  const res = await fetch(url, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  let huboJson = true;
  const data = await res.json().catch(() => { huboJson = false; return {}; });
  if (!huboJson && !res.ok) {
    throw new Error('El envío es muy pesado (probá con imágenes más livianas, menos de 5 MB cada una) o hubo un problema de conexión.');
  }
  if (!res.ok || data.ok === false) throw new Error(data.mensaje || 'Ocurrió un error. Probá de nuevo.');
  return data;
}

export default function AdminPage() {
  const [logueado, setLogueado] = useState(false);
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [ingresando, setIngresando] = useState(false);

  const [tab, setTab] = useState('oficiales');

  const [productosOficiales, setProductosOficiales] = useState([]);
  const [productosSocios, setProductosSocios] = useState([]);
  const [serviciosSocios, setServiciosSocios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [socios, setSocios] = useState([]);
  const [promos, setPromos] = useState([]);
  const [config, setConfig] = useState({});
  const [formConfig, setFormConfig] = useState({});
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [okConfig, setOkConfig] = useState('');
  const [errorConfig, setErrorConfig] = useState('');

  const [formPromo, setFormPromo] = useState(null);
  const [errorFormPromo, setErrorFormPromo] = useState('');
  const [okFormPromo, setOkFormPromo] = useState('');
  const [guardandoPromo, setGuardandoPromo] = useState(false);

  const [filtroProdSocios, setFiltroProdSocios] = useState('pendientes');
  const [busquedaProdSocios, setBusquedaProdSocios] = useState('');
  const [filtroServSocios, setFiltroServSocios] = useState('pendientes');
  const [busquedaServSocios, setBusquedaServSocios] = useState('');
  const [filtroPedidoEstado, setFiltroPedidoEstado] = useState('todos');
  const [busquedaPedido, setBusquedaPedido] = useState('');

  const [formProducto, setFormProducto] = useState(null);
  const [imagenesNuevas, setImagenesNuevas] = useState([]);
  const [errorFormProducto, setErrorFormProducto] = useState('');
  const [okFormProducto, setOkFormProducto] = useState('');
  const [guardandoProducto, setGuardandoProducto] = useState(false);

  const [variantesProducto, setVariantesProducto] = useState(null);
  const [errorVariantes, setErrorVariantes] = useState('');
  const [okVariantes, setOkVariantes] = useState('');
  const [guardandoVariantes, setGuardandoVariantes] = useState(false);

  const [detalleProdSocio, setDetalleProdSocio] = useState(null);
  const [detalleServSocio, setDetalleServSocio] = useState(null);

  const [detallePedido, setDetallePedido] = useState(null);
  const [nuevoEstadoPedido, setNuevoEstadoPedido] = useState('');
  const [errorEstadoPedido, setErrorEstadoPedido] = useState('');
  const [okEstadoPedido, setOkEstadoPedido] = useState('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [comprobanteUrls, setComprobanteUrls] = useState({});

  const [formSocio, setFormSocio] = useState(null);
  const [errorFormSocio, setErrorFormSocio] = useState('');
  const [okFormSocio, setOkFormSocio] = useState('');
  const [guardandoSocio, setGuardandoSocio] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api('/api/admin/session');
        if (resp.ok) {
          setLogueado(true);
          cargarTodo();
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
      const resp = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, clave }) });
      if (!resp.ok) { setErrorLogin(resp.mensaje); return; }
      setLogueado(true);
      cargarTodo();
    } catch (err) {
      setErrorLogin(err.message);
    } finally {
      setIngresando(false);
    }
  }

  async function cerrarSesion() {
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch (e) { }
    setLogueado(false);
    setEmail(''); setClave('');
  }

  function cargarTodo() {
    cargarProductosOficiales();
    cargarProductosSocios();
    cargarServiciosSocios();
    cargarPedidos();
    cargarSocios();
    cargarPromos();
    cargarConfig();
  }

  async function cargarPromos() {
    try {
      setPromos(await api('/api/admin/promociones'));
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }

  async function cargarConfig() {
    try {
      const c = await api('/api/admin/config');
      setConfig(c);
      setFormConfig(c);
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }

  async function guardarConfig(e) {
    e.preventDefault();
    setErrorConfig('');
    setOkConfig('');
    setGuardandoConfig(true);
    try {
      await api('/api/admin/config', { method: 'POST', body: JSON.stringify(formConfig) });
      setOkConfig('✅ Configuración guardada.');
      cargarConfig();
    } catch (err) {
      setErrorConfig(err.message);
    } finally {
      setGuardandoConfig(false);
    }
  }

  function abrirFormPromo(p) {
    setFormPromo(p || {
      id: '', nombre: '', codigo: '', tipo: 'PORCENTAJE', valor: '', cantidad: '', alcance: 'TODOS',
      productoId: '', activo: true, fechaInicio: '', fechaFin: '',
    });
    setErrorFormPromo('');
    setOkFormPromo('');
  }
  function cerrarFormPromo() { setFormPromo(null); }

  async function onSubmitPromo(e) {
    e.preventDefault();
    setErrorFormPromo('');
    setOkFormPromo('');
    setGuardandoPromo(true);
    try {
      await api('/api/admin/promociones', { method: 'POST', body: JSON.stringify({ ...formPromo, id: formPromo.id || null }) });
      setOkFormPromo('✅ Promoción guardada.');
      cargarPromos();
      setTimeout(cerrarFormPromo, 1000);
    } catch (err) {
      setErrorFormPromo(err.message);
    } finally {
      setGuardandoPromo(false);
    }
  }

  async function toggleActivoPromo(promo) {
    try {
      await api(`/api/admin/promociones/${promo.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !promo.activo }) });
      cargarPromos();
    } catch (err) {
      alert(err.message);
    }
  }

  function cambiarTab(t) { setTab(t); }

  async function cargarProductosOficiales() {
    try {
      setProductosOficiales(await api('/api/admin/productos-oficiales'));
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }

  function abrirFormProducto(p) {
    setFormProducto(p || { id: '', nombre: '', descripcion: '', precio: '', stock: '', talles: '', colores: '', imagenURL: '', activo: true, usaVariantes: false });
    setImagenesNuevas([]);
    setErrorFormProducto('');
    setOkFormProducto('');
  }
  function cerrarFormProducto() { setFormProducto(null); }

  function quitarURLImagen(idx) {
    setFormProducto((f) => {
      const urls = parseCSV(f.imagenURL);
      urls.splice(idx, 1);
      return { ...f, imagenURL: urls.join(', ') };
    });
  }

  async function onSeleccionarImagenesProducto(files) {
    setErrorFormProducto('');
    const lista = Array.from(files).map((f) => ({ file: f, id: Math.random().toString(36).slice(2) }));
    if (!lista.length) return;

    setImagenesNuevas(lista.map((it) => ({ id: it.id, nombreArchivo: it.file.name, subiendo: true, error: '' })));

    await Promise.all(lista.map(async ({ file, id }) => {
      try {
        const url = await subirImagenDirecta(file, 'oficial_' + (formProducto?.id || 'new'), '/api/admin/upload-url');
        setFormProducto((f) => {
          const urls = parseCSV(f.imagenURL);
          urls.push(url);
          return { ...f, imagenURL: urls.join(', ') };
        });
        setImagenesNuevas((prev) => prev.filter((it) => it.id !== id));
      } catch (err) {
        setImagenesNuevas((prev) => prev.map((it) => (it.id === id ? { ...it, subiendo: false, error: err.message } : it)));
      }
    }));
  }

  async function onSubmitProducto(e) {
    e.preventDefault();
    setErrorFormProducto('');
    setOkFormProducto('');
    if (imagenesNuevas.some((i) => i.subiendo)) {
      setErrorFormProducto('Esperá a que terminen de subirse las fotos.');
      return;
    }
    setGuardandoProducto(true);
    try {
      await api('/api/admin/productos-oficiales', {
        method: 'POST',
        body: JSON.stringify({
          ...formProducto,
          id: formProducto.id || null,
        }),
      });
      setOkFormProducto('✅ Producto guardado.');
      setImagenesNuevas([]);
      cargarProductosOficiales();
      setTimeout(cerrarFormProducto, 1200);
    } catch (err) {
      setErrorFormProducto(err.message);
    } finally {
      setGuardandoProducto(false);
    }
  }

  async function darDeBajaProductoOficial(id) {
    if (!confirm(`¿Dar de baja ${id}?`)) return;
    try {
      await api(`/api/admin/productos-oficiales/${id}`, { method: 'PATCH' });
      cargarProductosOficiales();
    } catch (err) {
      alert(err.message);
    }
  }

  async function abrirFormVariantes(prod) {
    setErrorVariantes('');
    setOkVariantes('');
    setVariantesProducto({ producto: prod, filas: null });
    try {
      const variantesServidor = await api(`/api/admin/productos-oficiales/${prod.id}/variantes`);
      const talles = parseCSV(prod.talles);
      const colores = parseCSV(prod.colores);
      const hayT = talles.length > 0, hayC = colores.length > 0;
      const stockMap = {};
      variantesServidor.forEach((v) => { stockMap[`${v.talle}|${v.color}`] = v.stock; });
      const combos = [];
      if (hayT && hayC) talles.forEach((t) => colores.forEach((c) => combos.push({ talle: t, color: c })));
      else if (hayT) talles.forEach((t) => combos.push({ talle: t, color: '' }));
      else colores.forEach((c) => combos.push({ talle: '', color: c }));
      setVariantesProducto({
        producto: prod,
        filas: combos.map((c) => ({ ...c, stock: stockMap[`${c.talle}|${c.color}`] ?? 0 })),
      });
    } catch (err) {
      setErrorVariantes(err.message);
    }
  }
  function cerrarFormVariantes() { setVariantesProducto(null); }

  function cambiarStockVariante(idx, valor) {
    setVariantesProducto((v) => {
      const filas = [...v.filas];
      filas[idx] = { ...filas[idx], stock: valor };
      return { ...v, filas };
    });
  }

  async function guardarVariantesOficial() {
    const filas = variantesProducto.filas;
    if (filas.some((f) => isNaN(Number(f.stock)) || Number(f.stock) < 0)) {
      setErrorVariantes('Revisá los valores.');
      return;
    }
    setGuardandoVariantes(true);
    setErrorVariantes('');
    try {
      const resp = await api(`/api/admin/productos-oficiales/${variantesProducto.producto.id}/variantes`, {
        method: 'PUT',
        body: JSON.stringify({ variantes: filas.map((f) => ({ talle: f.talle, color: f.color, stock: Number(f.stock) })) }),
      });
      setOkVariantes(`✅ Stock guardado. Total: ${resp.totalStock}`);
      cargarProductosOficiales();
    } catch (err) {
      setErrorVariantes(err.message);
    } finally {
      setGuardandoVariantes(false);
    }
  }

  async function cargarProductosSocios() {
    try {
      setProductosSocios(await api('/api/admin/productos-socios'));
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }
  const pendientesProdSocios = productosSocios.filter((p) => !p.aprobado).length;
  const listaProdSociosFiltrada = productosSocios.filter((p) => {
    if (filtroProdSocios === 'pendientes' && p.aprobado) return false;
    if (filtroProdSocios === 'aprobados' && !p.aprobado) return false;
    if (filtroProdSocios === 'inactivos' && p.aprobado) return false;
    const b = busquedaProdSocios.toLowerCase().trim();
    if (b && !(p.nombre + p.socioNombre + p.id).toLowerCase().includes(b)) return false;
    return true;
  });

  async function moderarProductoSocio(id, cambios) {
    try {
      await api(`/api/admin/productos-socios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
      cargarProductosSocios();
    } catch (err) {
      alert(err.message);
    }
  }

  async function cargarServiciosSocios() {
    try {
      setServiciosSocios(await api('/api/admin/servicios-socios'));
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }
  const pendientesServSocios = serviciosSocios.filter((s) => !s.aprobado).length;
  const listaServSociosFiltrada = serviciosSocios.filter((s) => {
    if (filtroServSocios === 'pendientes' && s.aprobado) return false;
    if (filtroServSocios === 'aprobados' && !s.aprobado) return false;
    if (filtroServSocios === 'inactivos' && s.aprobado) return false;
    const b = busquedaServSocios.toLowerCase().trim();
    if (b && !(s.rubro + s.socioNombre + s.id).toLowerCase().includes(b)) return false;
    return true;
  });

  async function moderarServicioSocio(id, cambios) {
    try {
      await api(`/api/admin/servicios-socios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
      cargarServiciosSocios();
    } catch (err) {
      alert(err.message);
    }
  }

  async function cargarPedidos() {
    try {
      setPedidos(await api('/api/admin/pedidos'));
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }
  const pedidosPendientes = pedidos.filter((p) => p.estado === 'Pendiente de comprobante(s)' || p.estado === 'Comprobantes recibidos').length;
  const listaPedidosFiltrada = pedidos.filter((p) => {
    if (filtroPedidoEstado !== 'todos' && p.estado !== filtroPedidoEstado) return false;
    const b = busquedaPedido.toLowerCase().trim();
    if (b && !(p.id + p.nombre + p.email + p.dni).toLowerCase().includes(b)) return false;
    return true;
  });

  function abrirDetallePedido(p) {
    setDetallePedido(p);
    setNuevoEstadoPedido(p.estado);
    setErrorEstadoPedido('');
    setOkEstadoPedido('');
    setComprobanteUrls({});
  }
  function cerrarDetallePedido() { setDetallePedido(null); }

  async function verComprobante(path) {
    try {
      const resp = await api(`/api/admin/comprobantes?path=${encodeURIComponent(path)}`);
      window.open(resp.url, '_blank');
    } catch (err) {
      alert(err.message);
    }
  }

  async function guardarEstadoPedido() {
    setGuardandoEstado(true);
    setErrorEstadoPedido('');
    setOkEstadoPedido('');
    try {
      await api(`/api/admin/pedidos/${detallePedido.id}`, { method: 'PATCH', body: JSON.stringify({ estado: nuevoEstadoPedido }) });
      setOkEstadoPedido('✅ Estado actualizado. Se notificó al comprador.');
      setPedidos((prev) => prev.map((p) => (p.id === detallePedido.id ? { ...p, estado: nuevoEstadoPedido } : p)));
      setDetallePedido((p) => ({ ...p, estado: nuevoEstadoPedido }));
    } catch (err) {
      setErrorEstadoPedido(err.message);
    } finally {
      setGuardandoEstado(false);
    }
  }

  async function cargarSocios() {
    try {
      setSocios(await api('/api/admin/socios'));
    } catch (e) {
      if (String(e.message || '').includes('Sesi')) { setLogueado(false); return; }
      alert('No se pudo actualizar: ' + e.message);
    }
  }

  function abrirFormSocio(s) {
    setFormSocio(s
      ? { ...s, nuevaClave: '', esNuevo: false }
      : { dni: '', nombre: '', apellido: '', email: '', telefono: '', aliasMP: '', cbu: '', tipo: 'Producto', activo: true, nuevaClave: '', esNuevo: true });
    setErrorFormSocio('');
    setOkFormSocio('');
  }
  function cerrarFormSocio() { setFormSocio(null); }

  async function onSubmitSocio(e) {
    e.preventDefault();
    setErrorFormSocio('');
    setOkFormSocio('');
    setGuardandoSocio(true);
    try {
      await api('/api/admin/socios', { method: 'POST', body: JSON.stringify(formSocio) });
      setOkFormSocio('✅ Socio guardado.');
      cargarSocios();
      setTimeout(cerrarFormSocio, 1200);
    } catch (err) {
      setErrorFormSocio(err.message);
    } finally {
      setGuardandoSocio(false);
    }
  }

  async function cambiarActivoSocio(dni, activo) {
    try {
      await api(`/api/admin/socios/${dni}`, { method: 'PATCH', body: JSON.stringify({ activo }) });
      cargarSocios();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!logueado) {
    return (
      <div className="adm-overlay">
        <div className="adm-drawer" style={{ maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
            <h3 style={{ margin: '0 0 4px' }}>Panel Admin</h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Ingresá con tu email y clave de administrador.</p>
          </div>
          <form onSubmit={onSubmitLogin}>
            <div className="adm-campo">
              <label>Email</label>
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="adm-campo">
              <label>Clave</label>
              <input type="password" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
            </div>
            {errorLogin && <p className="adm-error">{errorLogin}</p>}
            <button type="submit" className="adm-btn-primario" style={{ width: '100%', marginTop: 6 }} disabled={ingresando}>
              {ingresando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="adm-header">
        <h1>⚙️ Panel Admin <span className="adm-badge">Tienda Demo</span></h1>
        <button className="adm-header-cerrar" type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </header>

      <nav className="adm-nav">
        <button className={'adm-nav-btn' + (tab === 'oficiales' ? ' activa' : '')} onClick={() => cambiarTab('oficiales')}>Productos Oficiales</button>
        <button className={'adm-nav-btn' + (tab === 'socios-prod' ? ' activa' : '')} onClick={() => cambiarTab('socios-prod')}>
          Productos de Socios {pendientesProdSocios > 0 && <span className="adm-badge-count">{pendientesProdSocios}</span>}
        </button>
        <button className={'adm-nav-btn' + (tab === 'socios-serv' ? ' activa' : '')} onClick={() => cambiarTab('socios-serv')}>
          Servicios de Socios {pendientesServSocios > 0 && <span className="adm-badge-count">{pendientesServSocios}</span>}
        </button>
        <button className={'adm-nav-btn' + (tab === 'pedidos' ? ' activa' : '')} onClick={() => cambiarTab('pedidos')}>
          Pedidos {pedidosPendientes > 0 && <span className="adm-badge-count">{pedidosPendientes}</span>}
        </button>
        <button className={'adm-nav-btn' + (tab === 'socios' ? ' activa' : '')} onClick={() => cambiarTab('socios')}>Socios</button>
        <button className={'adm-nav-btn' + (tab === 'promos' ? ' activa' : '')} onClick={() => cambiarTab('promos')}>Promociones</button>
        <button className={'adm-nav-btn' + (tab === 'config' ? ' activa' : '')} onClick={() => cambiarTab('config')}>Configuración</button>
      </nav>

      {tab === 'oficiales' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header">
            <h2>Productos Oficiales</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="adm-btn-secundario" onClick={cargarProductosOficiales}>↻ Actualizar</button>
              <button className="adm-btn-primario" onClick={() => abrirFormProducto(null)}>+ Nuevo producto</button>
            </div>
          </div>
          {productosOficiales.length === 0 ? (
            <p className="adm-vacio">No hay productos cargados.</p>
          ) : (
            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead><tr><th>Fotos</th><th>ID</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Talles</th><th>Colores</th><th>Activo</th><th>Acciones</th></tr></thead>
                <tbody>
                  {productosOficiales.map((p) => {
                    const imgs = parseCSV(p.imagenURL);
                    return (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {imgs.length ? imgs.slice(0, 3).map((u, i) => (
                            <img key={i} src={u} onError={(e) => { e.target.style.opacity = 0.3; }} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, marginRight: 3 }} />
                          )) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td><code style={{ fontSize: 11.5 }}>{p.id}</code></td>
                        <td><strong>{p.nombre}</strong></td>
                        <td>${fmt(p.precio)}</td>
                        <td>{p.stock}</td>
                        <td>{p.talles || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td>{p.colores || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td><span className={p.activo ? 'adm-tag-si' : 'adm-tag-no'}>{p.activo ? 'Sí' : 'No'}</span></td>
                        <td>
                          <div className="adm-acciones">
                            <button className="adm-btn-sm" onClick={() => abrirFormProducto(p)}>Editar</button>
                            <button className="adm-btn-sm" onClick={() => abrirFormVariantes(p)}>Variantes</button>
                            {p.activo && <button className="adm-btn-peligro" onClick={() => darDeBajaProductoOficial(p.id)}>Dar de baja</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'socios-prod' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header"><h2>Productos de Socios</h2><button type="button" className="adm-btn-secundario" onClick={cargarProductosSocios}>↻ Actualizar</button></div>
          <div className="adm-filtro">
            <select value={filtroProdSocios} onChange={(e) => setFiltroProdSocios(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendientes">Solo pendientes</option>
              <option value="aprobados">Solo aprobados</option>
              <option value="inactivos">Dados de baja</option>
            </select>
            <input type="text" placeholder="Buscar por nombre o socio…" value={busquedaProdSocios} onChange={(e) => setBusquedaProdSocios(e.target.value)} />
          </div>
          {listaProdSociosFiltrada.length === 0 ? (
            <p className="adm-vacio">Sin resultados.</p>
          ) : (
            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead><tr><th>Foto</th><th>ID</th><th>Socio</th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Aprobado</th><th>Activo (socio)</th><th>Acciones</th></tr></thead>
                <tbody>
                  {listaProdSociosFiltrada.map((p) => {
                    const imgs = parseCSV(p.imagenesURL);
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setDetalleProdSocio(p)}>
                        <td>{imgs[0] ? <img src={imgs[0]} onError={(e) => { e.target.style.opacity = 0.3; }} /> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td><code style={{ fontSize: 11 }}>{p.id}</code></td>
                        <td style={{ fontSize: 12 }}>{p.socioNombre}</td>
                        <td><strong>{p.nombre}</strong><br /><span style={{ fontSize: 11.5, color: '#64748b' }}>{p.descripcion.substring(0, 60)}{p.descripcion.length > 60 ? '…' : ''}</span></td>
                        <td>${fmt(p.precio)}</td>
                        <td>{p.stock}</td>
                        <td><span className={p.aprobado ? 'adm-tag-si' : 'adm-tag-pend'}>{p.aprobado ? 'Sí' : 'Pendiente'}</span></td>
                        <td><span className={p.activo ? 'adm-tag-si' : 'adm-tag-no'}>{p.activo ? 'Sí' : 'No'}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="adm-acciones">
                            {p.aprobado
                              ? <button className="adm-btn-peligro" onClick={() => moderarProductoSocio(p.id, { aprobado: false })}>Dar de baja</button>
                              : <button className="adm-btn-primario" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => moderarProductoSocio(p.id, { aprobado: true })}>✅ Aprobar</button>}
                            {p.aprobado && p.activo && (
                              <button className="adm-btn-sm" onClick={() => moderarProductoSocio(p.id, { destacado: !p.destacado })}>{p.destacado ? '★' : '☆'}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'socios-serv' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header"><h2>Servicios de Socios</h2><button type="button" className="adm-btn-secundario" onClick={cargarServiciosSocios}>↻ Actualizar</button></div>
          <div className="adm-filtro">
            <select value={filtroServSocios} onChange={(e) => setFiltroServSocios(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendientes">Solo pendientes</option>
              <option value="aprobados">Solo aprobados</option>
              <option value="inactivos">Dados de baja</option>
            </select>
            <input type="text" placeholder="Buscar por rubro o socio…" value={busquedaServSocios} onChange={(e) => setBusquedaServSocios(e.target.value)} />
          </div>
          {listaServSociosFiltrada.length === 0 ? (
            <p className="adm-vacio">Sin resultados.</p>
          ) : (
            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead><tr><th>Foto</th><th>Rubro</th><th>Socio</th><th>Zona</th><th>Disponible</th><th>Aprobado</th><th>Activo (socio)</th><th>Acciones</th></tr></thead>
                <tbody>
                  {listaServSociosFiltrada.map((s) => {
                    const imgs = parseCSV(s.imagenesURL);
                    return (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setDetalleServSocio(s)}>
                        <td>{imgs[0] ? <img src={imgs[0]} onError={(e) => { e.target.style.opacity = 0.3; }} /> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td><strong>{s.rubro}</strong><br /><span style={{ fontSize: 11.5, color: '#64748b' }}>{s.descripcion.substring(0, 60)}{s.descripcion.length > 60 ? '…' : ''}</span></td>
                        <td style={{ fontSize: 12 }}>{s.socioNombre}</td>
                        <td style={{ fontSize: 12 }}>{s.zonaCobertura || '—'}</td>
                        <td><span className={s.disponible ? 'adm-tag-si' : 'adm-tag-no'}>{s.disponible ? 'Sí' : 'No'}</span></td>
                        <td><span className={s.aprobado ? 'adm-tag-si' : 'adm-tag-pend'}>{s.aprobado ? 'Sí' : 'Pendiente'}</span></td>
                        <td><span className={s.activo ? 'adm-tag-si' : 'adm-tag-no'}>{s.activo ? 'Sí' : 'No'}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="adm-acciones">
                            {s.aprobado
                              ? <button className="adm-btn-peligro" onClick={() => moderarServicioSocio(s.id, { aprobado: false })}>Dar de baja</button>
                              : <button className="adm-btn-primario" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => moderarServicioSocio(s.id, { aprobado: true })}>✅ Aprobar</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'pedidos' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header">
            <h2>Pedidos</h2>
            <button type="button" className="adm-btn-secundario" onClick={cargarPedidos}>↻ Actualizar</button>
          </div>
          <div className="adm-filtro">
            <select value={filtroPedidoEstado} onChange={(e) => setFiltroPedidoEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="Pendiente de comprobante(s)">Pendiente comprobante</option>
              <option value="Comprobantes recibidos">Comprobantes recibidos</option>
              <option value="En camino">En camino</option>
              <option value="Entregado">Entregado</option>
            </select>
            <input type="text" placeholder="Buscar por ID, nombre, email…" value={busquedaPedido} onChange={(e) => setBusquedaPedido(e.target.value)} />
          </div>
          {listaPedidosFiltrada.length === 0 ? (
            <p className="adm-vacio">Sin resultados.</p>
          ) : (
            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead><tr><th>ID</th><th>Fecha</th><th>Comprador</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {listaPedidosFiltrada.map((p) => {
                    const tagClass = {
                      'Entregado': 'adm-tag-si',
                      'Comprobantes recibidos': 'adm-tag-si',
                      'Pendiente de comprobante(s)': 'adm-tag-pend',
                      'Cancelado': 'adm-tag-no',
                    }[p.estado] || 'adm-tag-pend';
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirDetallePedido(p)}>
                        <td><code style={{ fontSize: 11.5 }}>{p.id}</code></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{p.fecha}</td>
                        <td><strong>{p.nombre}</strong><br /><span style={{ fontSize: 11.5, color: '#64748b' }}>{p.email}</span></td>
                        <td>${fmt(p.total)}</td>
                        <td><span className={tagClass}>{p.estado}</span></td>
                        <td onClick={(e) => e.stopPropagation()}><button className="adm-btn-sm" onClick={() => abrirDetallePedido(p)}>Ver</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'socios' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header">
            <h2>Socios habilitados</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="adm-btn-secundario" onClick={cargarSocios}>↻ Actualizar</button>
              <button className="adm-btn-primario" onClick={() => abrirFormSocio(null)}>+ Nuevo socio</button>
            </div>
          </div>
          {socios.length === 0 ? (
            <p className="adm-vacio">No hay socios registrados.</p>
          ) : (
            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead><tr><th>DNI</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Alias MP</th><th>CBU</th><th>Activo</th><th>Acciones</th></tr></thead>
                <tbody>
                  {socios.map((s) => {
                    let waNum = s.telefono ? String(s.telefono).replace(/\D/g, '') : '';
                    if (waNum && waNum.length <= 10) waNum = '549' + waNum.replace(/^0/, '');
                    return (
                      <tr key={s.dni}>
                        <td>
                          <code>{s.dni}</code><br />
                          <span className={'adm-badge-tipo ' + (s.tipo === 'Servicio' ? 'adm-badge-tipo-servicio' : 'adm-badge-tipo-producto')}>
                            {s.tipo === 'Servicio' ? '🔧 Servicios' : '📦 Productos'}
                          </span>
                        </td>
                        <td><strong>{s.nombre} {s.apellido}</strong></td>
                        <td style={{ fontSize: 12 }}>{s.email}</td>
                        <td style={{ fontSize: 12 }}>
                          <div>{s.telefono}</div>
                          {waNum && <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#25d366', color: '#fff', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 700, textDecoration: 'none', marginTop: 4 }}>📱 WA</a>}
                        </td>
                        <td>{s.aliasMP || '—'}</td>
                        <td style={{ fontSize: 11.5 }}>{s.cbu || '—'}</td>
                        <td><span className={s.activo ? 'adm-tag-si' : 'adm-tag-no'}>{s.activo ? 'Sí' : 'No'}</span></td>
                        <td>
                          <div className="adm-acciones">
                            <button className="adm-btn-sm" onClick={() => abrirFormSocio(s)}>Editar</button>
                            {s.activo
                              ? <button className="adm-btn-peligro" onClick={() => cambiarActivoSocio(s.dni, false)}>Dar de baja</button>
                              : <button className="adm-btn-sm adm-btn-activar" onClick={() => cambiarActivoSocio(s.dni, true)}>Reactivar</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'promos' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header">
            <h2>Promociones</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="adm-btn-secundario" onClick={cargarPromos}>↻ Actualizar</button>
              <button className="adm-btn-primario" onClick={() => abrirFormPromo(null)}>+ Nueva promoción</button>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>
            Las promociones solo aplican a Productos Oficiales (nunca a productos ni servicios de socios).
          </p>
          {promos.length === 0 ? (
            <p className="adm-vacio">No hay promociones cargadas.</p>
          ) : (
            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead><tr><th>Nombre</th><th>Código</th><th>Tipo</th><th>Alcance</th><th>Activa</th><th>Acciones</th></tr></thead>
                <tbody>
                  {promos.map((p) => {
                    const prod = productosOficiales.find((x) => x.id === p.productoId);
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.nombre}</strong></td>
                        <td>{p.codigo ? <code>{p.codigo}</code> : <span style={{ color: '#94a3b8' }}>Automática</span>}</td>
                        <td>{p.tipo === '2X1' ? '2x1' : p.tipo === 'NXPRECIO' ? `${p.cantidad}x$${p.valor}` : `${p.valor}% off`}</td>
                        <td>{p.alcance === 'TODOS' ? 'Todo el catálogo oficial' : (prod ? prod.nombre : 'Producto puntual')}</td>
                        <td><span className={p.activo ? 'adm-tag-si' : 'adm-tag-no'}>{p.activo ? 'Sí' : 'No'}</span></td>
                        <td>
                          <div className="adm-acciones">
                            <button className="adm-btn-sm" onClick={() => abrirFormPromo(p)}>Editar</button>
                            <button className={p.activo ? 'adm-btn-peligro' : 'adm-btn-sm adm-btn-activar'} onClick={() => toggleActivoPromo(p)}>
                              {p.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'config' && (
        <section className="adm-seccion activa">
          <div className="adm-seccion-header">
            <h2>Configuración de la tienda</h2>
            <button type="button" className="adm-btn-secundario" onClick={cargarConfig}>↻ Actualizar</button>
          </div>
          <form onSubmit={guardarConfig} style={{ maxWidth: 560 }}>
            <div className="adm-campo">
              <label>Nombre de la tienda</label>
              <input type="text" value={formConfig.NombreTienda || ''} onChange={(e) => setFormConfig({ ...formConfig, NombreTienda: e.target.value })} />
            </div>
            <div className="adm-campo-fila">
              <div className="adm-campo">
                <label>Color primario</label>
                <input type="text" value={formConfig.ColorPrimario || ''} onChange={(e) => setFormConfig({ ...formConfig, ColorPrimario: e.target.value })} />
              </div>
              <div className="adm-campo">
                <label>Color acento</label>
                <input type="text" value={formConfig.ColorAcento || ''} onChange={(e) => setFormConfig({ ...formConfig, ColorAcento: e.target.value })} />
              </div>
              <div className="adm-campo">
                <label>Color bordo</label>
                <input type="text" value={formConfig.ColorBordo || ''} onChange={(e) => setFormConfig({ ...formConfig, ColorBordo: e.target.value })} />
              </div>
            </div>
            <div className="adm-campo">
              <label>Imagen de banner (URL)</label>
              <input type="text" value={formConfig.ImagenBanner || ''} onChange={(e) => setFormConfig({ ...formConfig, ImagenBanner: e.target.value })} />
            </div>
            <div className="adm-campo-fila">
              <div className="adm-campo">
                <label>Alias de transferencia (Tienda Oficial)</label>
                <input type="text" value={formConfig.AliasTransferencia || ''} onChange={(e) => setFormConfig({ ...formConfig, AliasTransferencia: e.target.value })} />
              </div>
              <div className="adm-campo">
                <label>CBU/CVU (Tienda Oficial)</label>
                <input type="text" value={formConfig.CBU || ''} onChange={(e) => setFormConfig({ ...formConfig, CBU: e.target.value })} />
              </div>
            </div>
            <div className="adm-campo">
              <label>Email para notificaciones internas</label>
              <input type="email" value={formConfig.EmailAdmin || ''} onChange={(e) => setFormConfig({ ...formConfig, EmailAdmin: e.target.value })} />
            </div>
            <div className="adm-campo">
              <label>Remitente de los emails (Resend)</label>
              <input type="text" placeholder="Mi Tienda <tienda@tu-dominio.com>" value={formConfig.EmailRemitente || ''} onChange={(e) => setFormConfig({ ...formConfig, EmailRemitente: e.target.value })} />
              <p className="adm-campo-ayuda">Tiene que ser de un dominio verificado en Resend.</p>
            </div>
            <div className="adm-campo">
              <label>WhatsApp de contacto (con código de país, sin +)</label>
              <input type="text" placeholder="549XXXXXXXXXX" value={formConfig.WhatsAppContacto || ''} onChange={(e) => setFormConfig({ ...formConfig, WhatsAppContacto: e.target.value })} />
            </div>
            <div className="adm-campo">
              <label>Mensaje de confirmación de compra</label>
              <textarea value={formConfig.MensajeConfirmacion || ''} onChange={(e) => setFormConfig({ ...formConfig, MensajeConfirmacion: e.target.value })} />
            </div>
            {errorConfig && <p className="adm-error">{errorConfig}</p>}
            {okConfig && <div className="adm-ok">{okConfig}</div>}
            <button type="submit" className="adm-btn-primario" disabled={guardandoConfig}>{guardandoConfig ? 'Guardando...' : 'Guardar configuración'}</button>
          </form>
        </section>
      )}

      {formProducto && (
        <div className="adm-overlay">
          <div className="adm-drawer">
            <div className="adm-drawer-header">
              <h3>{formProducto.id ? `Editar ${formProducto.id}` : 'Nuevo producto oficial'}</h3>
              <button className="adm-cerrar" onClick={cerrarFormProducto}>✕</button>
            </div>
            <form onSubmit={onSubmitProducto}>
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>Nombre</label>
                  <input type="text" required value={formProducto.nombre} onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })} />
                </div>
                <div className="adm-campo" style={{ maxWidth: 110 }}>
                  <label>Precio ($)</label>
                  <input type="number" min="0" step="0.01" required value={formProducto.precio} onChange={(e) => setFormProducto({ ...formProducto, precio: e.target.value })} />
                </div>
              </div>
              <div className="adm-campo">
                <label>Descripción</label>
                <textarea value={formProducto.descripcion} onChange={(e) => setFormProducto({ ...formProducto, descripcion: e.target.value })} />
              </div>
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>Talles</label>
                  <input type="text" placeholder="S,M,L,XL" value={formProducto.talles} onChange={(e) => setFormProducto({ ...formProducto, talles: e.target.value })} />
                  <p className="adm-campo-ayuda">Separados con coma.</p>
                </div>
                <div className="adm-campo">
                  <label>Colores</label>
                  <input type="text" placeholder="Azul,Blanco" value={formProducto.colores} onChange={(e) => setFormProducto({ ...formProducto, colores: e.target.value })} />
                </div>
                <div className="adm-campo" style={{ maxWidth: 90 }}>
                  <label>Stock</label>
                  <input type="number" min="0" step="1" required value={formProducto.stock} onChange={(e) => setFormProducto({ ...formProducto, stock: e.target.value })} />
                  <p className="adm-campo-ayuda">General.</p>
                </div>
              </div>

              <div className="adm-campo">
                <label>URLs de imágenes (separadas por coma)</label>
                <textarea rows={2} placeholder="https://…, https://…" value={formProducto.imagenURL} onChange={(e) => setFormProducto({ ...formProducto, imagenURL: e.target.value })} />
                <p className="adm-campo-ayuda">Podés pegar varias URLs separadas por coma. O subí imágenes nuevas abajo.</p>
              </div>
              {parseCSV(formProducto.imagenURL).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {parseCSV(formProducto.imagenURL).map((u, i) => (
                    <div key={i} style={{ position: 'relative', display: 'inline-block', margin: 3 }}>
                      <img src={u} onError={(e) => { e.target.style.opacity = 0.3; }} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 7, border: '1.5px solid #e2e8f4' }} />
                      <button type="button" onClick={() => quitarURLImagen(i)} title="Quitar" style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="adm-campo">
                <label>Subir imágenes nuevas (máx. 5 MB cada una)</label>
                <input type="file" accept="image/*" multiple onChange={(e) => onSeleccionarImagenesProducto(e.target.files)} />
                <p className="adm-campo-ayuda">Podés seleccionar varias a la vez. Se agregarán a las URLs existentes.</p>
              </div>
              {imagenesNuevas.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {imagenesNuevas.map((img) => (
                    <p key={img.id} style={{ fontSize: 12.5, margin: '2px 0', color: img.error ? '#b91c1c' : '#1e6b3a' }}>
                      {img.error ? `❌ ${img.nombreArchivo}: ${img.error}` : `⏳ Subiendo "${img.nombreArchivo}"...`}
                    </p>
                  ))}
                </div>
              )}

              <div className="adm-campo">
                <label className="adm-switch">
                  <input type="checkbox" checked={!!formProducto.usaVariantes} onChange={(e) => setFormProducto({ ...formProducto, usaVariantes: e.target.checked })} /> Controlar stock por talle/color por separado
                </label>
                <p className="adm-campo-ayuda">
                  Si lo activás, el Stock general de arriba tiene que coincidir siempre con la suma de las variantes
                  (se valida al guardar). Cargá o ajustá esa suma desde el botón "Variantes".
                </p>
              </div>
              <div className="adm-campo">
                <label className="adm-switch">
                  <input type="checkbox" checked={formProducto.activo} onChange={(e) => setFormProducto({ ...formProducto, activo: e.target.checked })} /> Publicado en la tienda
                </label>
              </div>
              {errorFormProducto && <p className="adm-error">{errorFormProducto}</p>}
              {okFormProducto && <div className="adm-ok">{okFormProducto}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="button" className="adm-btn-secundario" onClick={cerrarFormProducto}>Cancelar</button>
                <button type="submit" className="adm-btn-primario" style={{ flex: 1 }} disabled={guardandoProducto}>{guardandoProducto ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {variantesProducto && (
        <div className="adm-overlay">
          <div className="adm-drawer">
            <div className="adm-drawer-header">
              <h3>Stock por variante · {variantesProducto.producto.id}</h3>
              <button className="adm-cerrar" onClick={cerrarFormVariantes}>✕</button>
            </div>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px' }}>El stock general del producto se actualiza automáticamente como la suma de todas las variantes al guardar.</p>
            {variantesProducto.filas === null ? (
              <p className="adm-vacio">Cargando...</p>
            ) : variantesProducto.filas.length === 0 ? (
              <p className="adm-vacio">Sin talles ni colores. Agregalos primero.</p>
            ) : (
              (() => {
                const hayT = parseCSV(variantesProducto.producto.talles).length > 0;
                const hayC = parseCSV(variantesProducto.producto.colores).length > 0;
                return (
                  <table className="adm-var-tabla">
                    <thead><tr>{hayT && <th>Talle</th>}{hayC && <th>Color</th>}<th>Stock</th></tr></thead>
                    <tbody>
                      {variantesProducto.filas.map((f, idx) => (
                        <tr key={idx}>
                          {hayT && <td>{f.talle}</td>}
                          {hayC && <td>{f.color}</td>}
                          <td><input type="number" min="0" step="1" value={f.stock} onChange={(e) => cambiarStockVariante(idx, e.target.value)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            )}
            {errorVariantes && <p className="adm-error">{errorVariantes}</p>}
            {okVariantes && <div className="adm-ok">{okVariantes}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="button" className="adm-btn-secundario" onClick={cerrarFormVariantes}>Cerrar</button>
              <button className="adm-btn-primario" style={{ flex: 1 }} disabled={guardandoVariantes || !variantesProducto.filas?.length} onClick={guardarVariantesOficial}>
                {guardandoVariantes ? 'Guardando...' : 'Guardar variantes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleProdSocio && (
        <div className="adm-overlay">
          <div className="adm-drawer" style={{ maxWidth: 560 }}>
            <div className="adm-drawer-header">
              <h3>Detalle del producto</h3>
              <button className="adm-cerrar" onClick={() => setDetalleProdSocio(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--color-primario)' }}>{detalleProdSocio.nombre}</h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>Por: <strong>{detalleProdSocio.socioNombre}</strong> · <code>{detalleProdSocio.id}</code>{detalleProdSocio.fecha ? ` · ${detalleProdSocio.fecha}` : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className={detalleProdSocio.aprobado ? 'adm-tag-si' : 'adm-tag-pend'}>{detalleProdSocio.aprobado ? 'Aprobado' : 'Pendiente'}</span>
                <span className={detalleProdSocio.activo ? 'adm-tag-si' : 'adm-tag-no'}>{detalleProdSocio.activo ? 'Activo (socio)' : 'Inactivo (socio)'}</span>
              </div>
            </div>
            {parseCSV(detalleProdSocio.imagenesURL).length > 0 ? (
              <div className="adm-galeria">
                {parseCSV(detalleProdSocio.imagenesURL).map((u, i) => (
                  <img key={i} src={u} onError={(e) => { e.target.style.opacity = 0.3; }} onClick={() => window.open(u, '_blank')} />
                ))}
              </div>
            ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin imágenes.</p>}
            <div className="adm-detalle-grid">
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Precio</p><strong style={{ fontSize: 15 }}>${fmt(detalleProdSocio.precio)}</strong></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Stock</p><strong style={{ fontSize: 15 }}>{detalleProdSocio.stock}</strong></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Talles</p><span>{detalleProdSocio.talles || '—'}</span></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Colores</p><span>{detalleProdSocio.colores || '—'}</span></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p className="adm-campo-ayuda" style={{ margin: '0 0 4px' }}>Descripción</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{detalleProdSocio.descripcion || '—'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {detalleProdSocio.aprobado
                ? <button className="adm-btn-peligro" onClick={() => { moderarProductoSocio(detalleProdSocio.id, { aprobado: false }); setDetalleProdSocio(null); }}>Dar de baja</button>
                : <button className="adm-btn-primario" onClick={() => { moderarProductoSocio(detalleProdSocio.id, { aprobado: true }); setDetalleProdSocio(null); }}>✅ Aprobar</button>}
              {detalleProdSocio.aprobado && detalleProdSocio.activo && (
                <button className="adm-btn-sm" onClick={() => { moderarProductoSocio(detalleProdSocio.id, { destacado: !detalleProdSocio.destacado }); setDetalleProdSocio(null); }}>
                  {detalleProdSocio.destacado ? '★ Quitar destaque' : '☆ Destacar'}
                </button>
              )}
              <button type="button" className="adm-btn-secundario" onClick={() => setDetalleProdSocio(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {detalleServSocio && (
        <div className="adm-overlay">
          <div className="adm-drawer" style={{ maxWidth: 560 }}>
            <div className="adm-drawer-header">
              <h3>Detalle del servicio</h3>
              <button className="adm-cerrar" onClick={() => setDetalleServSocio(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--color-primario)' }}>{detalleServSocio.rubro}</h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>Por: <strong>{detalleServSocio.socioNombre}</strong> · <code>{detalleServSocio.id}</code>{detalleServSocio.fecha ? ` · ${detalleServSocio.fecha}` : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={detalleServSocio.aprobado ? 'adm-tag-si' : 'adm-tag-pend'}>{detalleServSocio.aprobado ? 'Aprobado' : 'Pendiente'}</span>
                <span className={detalleServSocio.activo ? 'adm-tag-si' : 'adm-tag-no'}>{detalleServSocio.activo ? 'Activo (socio)' : 'Inactivo (socio)'}</span>
                <span className={detalleServSocio.disponible ? 'adm-tag-si' : 'adm-tag-no'}>{detalleServSocio.disponible ? 'Disponible' : 'No disponible'}</span>
              </div>
            </div>
            {parseCSV(detalleServSocio.imagenesURL).length > 0 ? (
              <div className="adm-galeria">
                {parseCSV(detalleServSocio.imagenesURL).map((u, i) => (
                  <img key={i} src={u} onError={(e) => { e.target.style.opacity = 0.3; }} onClick={() => window.open(u, '_blank')} />
                ))}
              </div>
            ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin imágenes.</p>}
            <div className="adm-detalle-grid">
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Zona de cobertura</p><span>{detalleServSocio.zonaCobertura || '—'}</span></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Horario</p><span>{detalleServSocio.horarioAtencion || '—'}</span></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Días</p><span>{detalleServSocio.dias || '—'}</span></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Modalidad</p><span>{detalleServSocio.fullTime ? 'Full time' : '—'}{detalleServSocio.urgencias ? ' · Atiende urgencias' : ''}</span></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p className="adm-campo-ayuda" style={{ margin: '0 0 4px' }}>Descripción</p>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{detalleServSocio.descripcion || '—'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {detalleServSocio.aprobado
                ? <button className="adm-btn-peligro" onClick={() => { moderarServicioSocio(detalleServSocio.id, { aprobado: false }); setDetalleServSocio(null); }}>Dar de baja</button>
                : <button className="adm-btn-primario" onClick={() => { moderarServicioSocio(detalleServSocio.id, { aprobado: true }); setDetalleServSocio(null); }}>✅ Aprobar</button>}
              <button type="button" className="adm-btn-secundario" onClick={() => setDetalleServSocio(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {detallePedido && (
        <div className="adm-overlay">
          <div className="adm-drawer" style={{ maxWidth: 600 }}>
            <div className="adm-drawer-header">
              <h3>Pedido #{detallePedido.id}</h3>
              <button className="adm-cerrar" onClick={cerrarDetallePedido}>✕</button>
            </div>
            <div className="adm-detalle-grid">
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Comprador</p><strong>{detallePedido.nombre}</strong></div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>DNI</p>{detallePedido.dni}</div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Email</p>{detallePedido.email}</div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Teléfono</p>{detallePedido.telefono}</div>
              <div className="full"><p className="adm-campo-ayuda" style={{ margin: 0 }}>Dirección</p>{detallePedido.direccion}</div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Fecha</p>{detallePedido.fecha}</div>
              <div><p className="adm-campo-ayuda" style={{ margin: 0 }}>Total</p><strong style={{ fontSize: 15 }}>${fmt(detallePedido.total)}</strong></div>
            </div>
            <h4>Productos</h4>
            <div className="adm-tabla-wrap" style={{ marginBottom: 14 }}>
              <table className="adm-tabla" style={{ minWidth: 0 }}>
                <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {(detallePedido.items || []).length ? detallePedido.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.nombre}{it.talle ? ` · ${it.talle}` : ''}{it.color ? ` / ${it.color}` : ''}</td>
                      <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>${fmt(it.precioUnitario)}</td>
                      <td style={{ textAlign: 'right' }}>${fmt(it.subtotal)}</td>
                    </tr>
                  )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
            <h4>Pagos</h4>
            <div className="adm-tabla-wrap" style={{ marginBottom: 16 }}>
              <table className="adm-tabla" style={{ minWidth: 0 }}>
                <thead><tr><th>Destinatario</th><th>Monto</th><th>Comprobante</th></tr></thead>
                <tbody>
                  {(detallePedido.pagos || []).length ? detallePedido.pagos.map((pg, i) => (
                    <tr key={i}>
                      <td>{pg.nombre || pg.vendorId}</td>
                      <td>${fmt(pg.monto)}</td>
                      <td>
                        {pg.comprobanteRecibido ? <span className="adm-tag-si">Recibido</span> : <span className="adm-tag-pend">Pendiente</span>}
                        {pg.comprobanteUrl && (
                          <button className="adm-btn-sm" style={{ marginLeft: 8 }} onClick={() => verComprobante(pg.comprobanteUrl)}>Ver comprobante</button>
                        )}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="adm-campo">
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Cambiar estado</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                <select value={nuevoEstadoPedido} onChange={(e) => setNuevoEstadoPedido(e.target.value)} style={{ border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', fontSize: 13, flex: 1 }}>
                  {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <button className="adm-btn-primario" disabled={guardandoEstado} onClick={guardarEstadoPedido}>{guardandoEstado ? 'Guardando...' : 'Guardar'}</button>
              </div>
              {errorEstadoPedido && <p className="adm-error">{errorEstadoPedido}</p>}
              {okEstadoPedido && <div className="adm-ok">{okEstadoPedido}</div>}
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="button" className="adm-btn-secundario" onClick={cerrarDetallePedido}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {formSocio && (
        <div className="adm-overlay">
          <div className="adm-drawer">
            <div className="adm-drawer-header">
              <h3>{formSocio.esNuevo ? 'Nuevo socio' : `Editar socio · DNI ${formSocio.dni}`}</h3>
              <button className="adm-cerrar" onClick={cerrarFormSocio}>✕</button>
            </div>
            <form onSubmit={onSubmitSocio}>
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>DNI</label>
                  <input type="text" inputMode="numeric" required readOnly={!formSocio.esNuevo} value={formSocio.dni} onChange={(e) => setFormSocio({ ...formSocio, dni: e.target.value })} />
                </div>
                <div className="adm-campo">
                  <label>Nombre</label>
                  <input type="text" required value={formSocio.nombre} onChange={(e) => setFormSocio({ ...formSocio, nombre: e.target.value })} />
                </div>
                <div className="adm-campo">
                  <label>Apellido</label>
                  <input type="text" required value={formSocio.apellido} onChange={(e) => setFormSocio({ ...formSocio, apellido: e.target.value })} />
                </div>
              </div>
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>Email</label>
                  <input type="email" value={formSocio.email} onChange={(e) => setFormSocio({ ...formSocio, email: e.target.value })} />
                </div>
                <div className="adm-campo">
                  <label>Teléfono</label>
                  <input type="tel" value={formSocio.telefono} onChange={(e) => setFormSocio({ ...formSocio, telefono: e.target.value })} />
                </div>
              </div>
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>Alias MP</label>
                  <input type="text" placeholder="alias.mp" value={formSocio.aliasMP} onChange={(e) => setFormSocio({ ...formSocio, aliasMP: e.target.value })} />
                </div>
                <div className="adm-campo">
                  <label>CBU</label>
                  <input type="text" inputMode="numeric" value={formSocio.cbu} onChange={(e) => setFormSocio({ ...formSocio, cbu: e.target.value })} />
                </div>
              </div>
              <div className="adm-campo">
                <label>Tipo de socio</label>
                <select value={formSocio.tipo} onChange={(e) => setFormSocio({ ...formSocio, tipo: e.target.value })}>
                  <option value="Producto">Vende productos</option>
                  <option value="Servicio">Ofrece servicios</option>
                </select>
                <p className="adm-campo-ayuda">Define si ve "Cargar producto" o "Cargar servicio" en el Portal.</p>
              </div>
              <div className="adm-campo">
                <label>Clave del portal</label>
                <input type="password" autoComplete="new-password" value={formSocio.nuevaClave} onChange={(e) => setFormSocio({ ...formSocio, nuevaClave: e.target.value })} />
                <p className="adm-campo-ayuda">{formSocio.esNuevo ? 'Obligatoria para nuevos socios (mínimo 6 caracteres).' : 'Dejalo vacío para no cambiarla.'}</p>
              </div>
              <div className="adm-campo">
                <label className="adm-switch">
                  <input type="checkbox" checked={formSocio.activo} onChange={(e) => setFormSocio({ ...formSocio, activo: e.target.checked })} /> Habilitado para vender en el portal
                </label>
              </div>
              {errorFormSocio && <p className="adm-error">{errorFormSocio}</p>}
              {okFormSocio && <div className="adm-ok">{okFormSocio}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="button" className="adm-btn-secundario" onClick={cerrarFormSocio}>Cancelar</button>
                <button type="submit" className="adm-btn-primario" style={{ flex: 1 }} disabled={guardandoSocio}>{guardandoSocio ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {formPromo && (
        <div className="adm-overlay">
          <div className="adm-drawer">
            <div className="adm-drawer-header">
              <h3>{formPromo.id ? 'Editar promoción' : 'Nueva promoción'}</h3>
              <button className="adm-cerrar" onClick={cerrarFormPromo}>✕</button>
            </div>
            <form onSubmit={onSubmitPromo}>
              <div className="adm-campo">
                <label>Nombre interno</label>
                <input type="text" required placeholder="Ej: 2x1 Buzo Aniversario" value={formPromo.nombre} onChange={(e) => setFormPromo({ ...formPromo, nombre: e.target.value })} />
              </div>
              <div className="adm-campo">
                <label>Código (opcional)</label>
                <input type="text" placeholder="Dejalo vacío para que se aplique sola, sin código" value={formPromo.codigo} onChange={(e) => setFormPromo({ ...formPromo, codigo: e.target.value.toUpperCase() })} />
                <p className="adm-campo-ayuda">Si cargás un código, el cliente tiene que escribirlo en el checkout para activarla.</p>
              </div>
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>Tipo</label>
                  <select
                    value={formPromo.tipo}
                    onChange={(e) => setFormPromo({ ...formPromo, tipo: e.target.value, alcance: (e.target.value === '2X1' || e.target.value === 'NXPRECIO') ? 'PRODUCTO' : formPromo.alcance })}
                  >
                    <option value="PORCENTAJE">% de descuento</option>
                    <option value="2X1">2x1 (entre variantes)</option>
                    <option value="NXPRECIO">Llevando X por $ (entre variantes)</option>
                  </select>
                </div>
                {formPromo.tipo === 'PORCENTAJE' && (
                  <div className="adm-campo" style={{ maxWidth: 110 }}>
                    <label>Porcentaje</label>
                    <input type="number" min="1" max="100" step="1" required value={formPromo.valor} onChange={(e) => setFormPromo({ ...formPromo, valor: e.target.value })} />
                  </div>
                )}
              </div>
              {formPromo.tipo === 'NXPRECIO' && (
                <div className="adm-campo-fila">
                  <div className="adm-campo" style={{ maxWidth: 110 }}>
                    <label>Llevando</label>
                    <input type="number" min="2" step="1" required placeholder="Ej: 2" value={formPromo.cantidad} onChange={(e) => setFormPromo({ ...formPromo, cantidad: e.target.value })} />
                  </div>
                  <div className="adm-campo">
                    <label>Precio total</label>
                    <input type="number" min="1" step="1" required placeholder="Ej: 8000" value={formPromo.valor} onChange={(e) => setFormPromo({ ...formPromo, valor: e.target.value })} />
                  </div>
                </div>
              )}
              {formPromo.tipo === 'PORCENTAJE' && (
                <div className="adm-campo">
                  <label>Alcance</label>
                  <select value={formPromo.alcance} onChange={(e) => setFormPromo({ ...formPromo, alcance: e.target.value })}>
                    <option value="TODOS">Todo el catálogo oficial</option>
                    <option value="PRODUCTO">Un producto puntual</option>
                  </select>
                </div>
              )}
              {(formPromo.tipo === '2X1' || formPromo.tipo === 'NXPRECIO' || formPromo.alcance === 'PRODUCTO') && (
                <div className="adm-campo">
                  <label>Producto oficial</label>
                  <select required value={formPromo.productoId} onChange={(e) => setFormPromo({ ...formPromo, productoId: e.target.value })}>
                    <option value="">Elegí un producto…</option>
                    {productosOficiales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {formPromo.tipo === '2X1' && <p className="adm-campo-ayuda">Cuenta unidades del producto sin importar talle/color: 1 rojo + 1 azul también arma el 2x1.</p>}
                  {formPromo.tipo === 'NXPRECIO' && <p className="adm-campo-ayuda">Cuenta unidades del producto sin importar talle/color: por ejemplo 1 talle S + 1 talle M también arman el combo.</p>}
                </div>
              )}
              <div className="adm-campo-fila">
                <div className="adm-campo">
                  <label>Desde (opcional)</label>
                  <input type="date" value={formPromo.fechaInicio || ''} onChange={(e) => setFormPromo({ ...formPromo, fechaInicio: e.target.value })} />
                </div>
                <div className="adm-campo">
                  <label>Hasta (opcional)</label>
                  <input type="date" value={formPromo.fechaFin || ''} onChange={(e) => setFormPromo({ ...formPromo, fechaFin: e.target.value })} />
                </div>
              </div>
              <div className="adm-campo">
                <label className="adm-switch">
                  <input type="checkbox" checked={formPromo.activo} onChange={(e) => setFormPromo({ ...formPromo, activo: e.target.checked })} /> Activa
                </label>
              </div>
              {errorFormPromo && <p className="adm-error">{errorFormPromo}</p>}
              {okFormPromo && <div className="adm-ok">{okFormPromo}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button type="button" className="adm-btn-secundario" onClick={cerrarFormPromo}>Cancelar</button>
                <button type="submit" className="adm-btn-primario" style={{ flex: 1 }} disabled={guardandoPromo}>{guardandoPromo ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
