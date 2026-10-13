import supabaseAdmin from './supabaseAdmin';
import { vendorPublicId } from './crypto';
import { obtenerConfig } from './config';

const MAX_ITEMS_CARRITO = 50;

export function generarIdPedido() {
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: '2-digit', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const partes = fmt.formatToParts(ahora).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return `TCF-${partes.year}${partes.month}${partes.day}-${partes.hour}${partes.minute}${partes.second}`;
}

export async function procesarItemsYStockSoloLectura(items) {
  const { itemsDetallados } = await calcularItemsDetallados(items, false);
  return itemsDetallados;
}

async function calcularItemsDetallados(items, aplicarEscrituras) {
  const config = await obtenerConfig();
  if (!Array.isArray(items) || !items.length) throw new Error('El carrito está vacío.');
  if (items.length > MAX_ITEMS_CARRITO) throw new Error('El carrito tiene demasiados productos.');
  items = items.map((i) => ({
    id: i && i.id,
    tipo: i && i.tipo === 'socio' ? 'socio' : 'oficial',
    cantidad: i && i.cantidad,
    talle: i && i.talle,
    color: i && i.color,
  }));

  const idsOficiales = items.filter((i) => i.tipo !== 'socio').map((i) => i.id);
  const idsSocios = items.filter((i) => i.tipo === 'socio').map((i) => i.id);

  const [oficialesRes, prodSociosRes, variantesRes, sociosRes] = await Promise.all([
    idsOficiales.length
      ? supabaseAdmin.from('productos_oficiales').select('*').in('id', idsOficiales)
      : Promise.resolve({ data: [] }),
    idsSocios.length
      ? supabaseAdmin.from('productos_socios').select('*').in('id', idsSocios)
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from('stock_variantes').select('*'),
    supabaseAdmin.from('socios').select('*'),
  ]);

  const oficiales = oficialesRes.data || [];
  const prodSocios = prodSociosRes.data || [];
  const socios = sociosRes.data || [];

  const variantesPorClave = {};
  (variantesRes.data || []).forEach((v) => {
    variantesPorClave[`${v.producto_id}|${v.talle || ''}|${v.color || ''}`] = v;
  });

  const itemsDetallados = [];
  const gruposPorId = {};

  const restanteProducto = {};
  const restanteVariante = {};

  for (const item of items) {
    const esSocio = item.tipo === 'socio';
    const lista = esSocio ? prodSocios : oficiales;
    const producto = lista.find((p) => String(p.id) === String(item.id));

    if (!producto) throw new Error('Uno de los productos del carrito ya no está disponible.');
    if (!producto.activo) throw new Error(`"${producto.nombre}" ya no está disponible.`);
    if (esSocio && !producto.aprobado) throw new Error(`"${producto.nombre}" ya no está disponible.`);

    let grupoId = 'CLUB', grupoNombre = config.NombreTienda || 'Tienda Oficial';
    let grupoAlias = config.AliasTransferencia || '', grupoCbu = config.CBU || '', grupoEmail = '', grupoTelefono = '';

    if (esSocio) {
      const socio = socios.find((s) => s.dni === producto.dni_socio && s.activo);
      if (!socio) throw new Error(`"${producto.nombre}" ya no está disponible.`);
      grupoId = vendorPublicId(socio.dni);
      grupoNombre = `${socio.nombre} ${socio.apellido}`.trim();
      grupoAlias = socio.alias_mp || '';
      grupoCbu = socio.cbu_cvu || '';
      grupoEmail = socio.email || '';
      grupoTelefono = socio.telefono || '';
    }

    const cantidad = Math.max(1, Math.floor(Number(item.cantidad) || 1));
    const talle = String(item.talle || '').trim();
    const color = String(item.color || '').trim();
    const variante = producto.usa_variantes
      ? variantesPorClave[`${producto.id}|${talle}|${color}`]
      : null;

    const claveProducto = `${esSocio}|${producto.id}`;
    if (!(claveProducto in restanteProducto)) {
      restanteProducto[claveProducto] = Math.max(0, Number(producto.stock) || 0);
    }

    let stockActual;
    if (variante) {
      if (!(variante.id in restanteVariante)) {
        restanteVariante[variante.id] = Math.max(0, Number(variante.stock) || 0);
      }
      stockActual = restanteVariante[variante.id];
      if (cantidad > stockActual) {
        throw new Error(
          `No hay stock suficiente de "${producto.nombre}" en talle ${talle || '-'} / color ${color || '-'} (disponible: ${stockActual}).`
        );
      }
      restanteVariante[variante.id] = stockActual - cantidad;
      restanteProducto[claveProducto] = Math.max(0, restanteProducto[claveProducto] - cantidad);
    } else {
      stockActual = restanteProducto[claveProducto];
      if (cantidad > stockActual) {
        throw new Error(`No hay stock suficiente de "${producto.nombre}" (disponible: ${stockActual}).`);
      }
      restanteProducto[claveProducto] = stockActual - cantidad;
    }

    const precioUnitario = Number(producto.precio) || 0;
    const subtotal = precioUnitario * cantidad;

    itemsDetallados.push({
      id: producto.id, nombre: producto.nombre, talle, color, cantidad,
      precioUnitario, subtotal, tipo: item.tipo, grupoId,
    });

    if (!gruposPorId[grupoId]) {
      gruposPorId[grupoId] = {
        vendorId: grupoId, nombre: grupoNombre, alias: grupoAlias,
        cbu: grupoCbu, email: grupoEmail, telefono: grupoTelefono, monto: 0,
      };
    }
    gruposPorId[grupoId].monto += subtotal;
  }

  if (aplicarEscrituras) {
    for (const [varianteId, nuevoStock] of Object.entries(restanteVariante)) {
      const { error } = await supabaseAdmin.from('stock_variantes').update({ stock: nuevoStock }).eq('id', varianteId);
      if (error) throw new Error('Error actualizando stock de variante: ' + error.message);
    }
    for (const [clave, nuevoStock] of Object.entries(restanteProducto)) {
      const [esSocioStr, id] = clave.split('|');
      const tabla = esSocioStr === 'true' ? 'productos_socios' : 'productos_oficiales';
      const { error } = await supabaseAdmin.from(tabla).update({ stock: nuevoStock }).eq('id', id);
      if (error) throw new Error('Error actualizando stock de producto: ' + error.message);
    }
  }

  const total = itemsDetallados.reduce((acc, it) => acc + it.subtotal, 0);
  const grupos = Object.values(gruposPorId);

  return { total, itemsDetallados, grupos };
}

export async function procesarItemsYStock(items) {
  return calcularItemsDetallados(items, true);
}
