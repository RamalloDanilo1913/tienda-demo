import supabaseAdmin from './supabaseAdmin';
import { vendorPublicId } from './crypto';
import { obtenerConfigPublica } from './config';

function construirVariantesStock(variantesDelProducto) {
  const result = {};
  (variantesDelProducto || []).forEach((v) => {
    const key = `${v.talle || ''}|${v.color || ''}`;
    result[key] = Math.max(0, Number(v.stock) || 0);
  });
  return result;
}

function estaVigente(promo) {
  const ahora = new Date();
  if (promo.fecha_inicio && new Date(promo.fecha_inicio) > ahora) return false;
  if (promo.fecha_fin && new Date(promo.fecha_fin) < ahora) return false;
  return true;
}

function resolverPromoParaProducto(productoId, precioUnitario, promosAutomaticas) {
  const puntual = promosAutomaticas.find((p) => p.producto_id === productoId);
  const promo = puntual || promosAutomaticas.find((p) => p.alcance === 'TODOS' && p.tipo === 'PORCENTAJE');
  if (!promo) return null;

  if (promo.tipo === '2X1') {
    return { tipo: '2X1' };
  }
  if (promo.tipo === 'NXPRECIO') {
    const cantidad = Math.max(2, Math.floor(Number(promo.cantidad) || 0));
    const valor = Number(promo.valor) || 0;
    if (cantidad < 2 || valor <= 0) return null;
    return { tipo: 'NXPRECIO', cantidad, valor };
  }
  const valor = Number(promo.valor) || 0;
  if (valor <= 0) return null;
  const precioConDescuento = Math.round(precioUnitario * (1 - valor / 100) * 100) / 100;
  return { tipo: 'PORCENTAJE', valor, precioConDescuento };
}

function formatearOficial(p, variantesPorProducto, promosAutomaticas) {
  const precio = Number(p.precio) || 0;
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    precio,
    stock: Math.max(0, Number(p.stock) || 0),
    talles: p.talles || [],
    colores: p.colores || [],
    imagenes: p.imagenes || [],
    imagen: (p.imagenes && p.imagenes[0]) || '',
    tipo: 'oficial',
    variantesStock: p.usa_variantes ? construirVariantesStock(variantesPorProducto[p.id]) : {},
    promo: resolverPromoParaProducto(p.id, precio, promosAutomaticas),
  };
}

function formatearSocio(p, vendorId, vendorNombre, socio, variantesPorProducto) {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    precio: Number(p.precio) || 0,
    stock: Math.max(0, Number(p.stock) || 0),
    talles: p.talles || [],
    colores: p.colores || [],
    imagenes: p.imagenes || [],
    imagen: (p.imagenes && p.imagenes[0]) || '',
    tipo: 'socio',
    vendedorId: vendorId,
    vendedorNombre: vendorNombre,
    vendedorAlias: socio.alias_mp || '',
    vendedorCBU: socio.cbu_cvu || '',
    variantesStock: p.usa_variantes ? construirVariantesStock(variantesPorProducto[p.id]) : {},
  };
}

function formatearServicio(s, vendorId, vendorNombre, socio) {
  return {
    id: s.id,
    rubro: s.rubro,
    descripcion: s.descripcion || '',
    zonaCobertura: s.zona_cobertura || '',
    horarioAtencion: s.horario_atencion || '',
    dias: s.dias || '',
    fullTime: !!s.full_time,
    urgencias: !!s.urgencias,
    disponible: !!s.disponible,
    imagenes: s.imagenes || [],
    imagen: (s.imagenes && s.imagenes[0]) || '',
    tipo: 'servicio',
    vendedorId: vendorId,
    vendedorNombre: vendorNombre,
    vendedorTelefono: socio.telefono || '',
  };
}

export async function obtenerDatosTienda() {
  const [oficialesRes, sociosRes, prodSociosRes, serviciosRes, variantesRes, promosRes, config] = await Promise.all([
    supabaseAdmin.from('productos_oficiales').select('*').eq('activo', true).order('creado_en', { ascending: false }),
    supabaseAdmin.from('socios').select('*').eq('activo', true),
    supabaseAdmin.from('productos_socios').select('*').eq('aprobado', true).eq('activo', true).order('creado_en', { ascending: false }),
    supabaseAdmin.from('servicios_socios').select('*').eq('aprobado', true).eq('activo', true).order('creado_en', { ascending: true }),
    supabaseAdmin.from('stock_variantes').select('*'),
    supabaseAdmin.from('promociones').select('*').is('codigo', null).eq('activo', true),
    obtenerConfigPublica(),
  ]);

  for (const r of [oficialesRes, sociosRes, prodSociosRes, serviciosRes, variantesRes, promosRes]) {
    if (r.error) throw new Error('Error consultando Supabase: ' + r.error.message);
  }

  const promosAutomaticas = (promosRes.data || []).filter(estaVigente);

  const variantesPorProducto = {};
  (variantesRes.data || []).forEach((v) => {
    if (!variantesPorProducto[v.producto_id]) variantesPorProducto[v.producto_id] = [];
    variantesPorProducto[v.producto_id].push(v);
  });

  const sociosPorDni = {};
  (sociosRes.data || []).forEach((s) => { sociosPorDni[s.dni] = s; });

  const oficiales = (oficialesRes.data || []).map((p) => formatearOficial(p, variantesPorProducto, promosAutomaticas));

  const vendedoresPorId = {};
  (prodSociosRes.data || []).forEach((p) => {
    const socio = sociosPorDni[p.dni_socio];
    if (!socio) return;
    const vendorId = vendorPublicId(p.dni_socio);
    if (!vendedoresPorId[vendorId]) {
      vendedoresPorId[vendorId] = {
        vendorId,
        nombre: `${socio.nombre} ${socio.apellido}`.trim(),
        productos: [],
        destacado: null,
      };
    }
    const formateado = formatearSocio(p, vendorId, vendedoresPorId[vendorId].nombre, socio, variantesPorProducto);
    vendedoresPorId[vendorId].productos.push(formateado);
    if (p.destacado) vendedoresPorId[vendorId].destacado = formateado;
  });

  const vendedores = Object.values(vendedoresPorId)
    .map((v) => {
      const destacado = v.destacado || v.productos[0] || null;
      const productosOrdenados = destacado
        ? [destacado, ...v.productos.filter((p) => p.id !== destacado.id)]
        : v.productos;
      return { vendorId: v.vendorId, nombre: v.nombre, productos: productosOrdenados, destacado };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const servicios = (serviciosRes.data || [])
    .map((s) => {
      const socio = sociosPorDni[s.dni_socio];
      if (!socio) return null;
      const vendorId = vendorPublicId(s.dni_socio);
      const vendorNombre = `${socio.nombre} ${socio.apellido}`.trim();
      return formatearServicio(s, vendorId, vendorNombre, socio);
    })
    .filter(Boolean);

  return {
    oficiales, vendedores, servicios, config,
    promosAutomaticas: promosAutomaticas.map((p) => ({
      tipo: p.tipo, valor: p.valor, alcance: p.alcance, producto_id: p.producto_id, cantidad: p.cantidad,
    })),
  };
}
