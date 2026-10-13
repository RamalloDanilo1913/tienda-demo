import supabaseAdmin from './supabaseAdmin';

function estaVigente(promo) {
  const ahora = new Date();
  if (promo.fecha_inicio && new Date(promo.fecha_inicio) > ahora) return false;
  if (promo.fecha_fin && new Date(promo.fecha_fin) < ahora) return false;
  return true;
}

export async function obtenerPromosAplicables(codigoIngresado) {
  const { data: automaticas, error: errAuto } = await supabaseAdmin
    .from('promociones').select('*').is('codigo', null).eq('activo', true);
  if (errAuto) throw new Error('Error leyendo promociones: ' + errAuto.message);

  const promos = (automaticas || []).filter(estaVigente);

  const codigo = String(codigoIngresado || '').trim().toUpperCase();
  if (codigo) {
    const { data: promoCodigo, error: errCod } = await supabaseAdmin
      .from('promociones').select('*').eq('codigo', codigo).maybeSingle();
    if (errCod) throw new Error('Error validando el código: ' + errCod.message);
    if (!promoCodigo || !promoCodigo.activo || !estaVigente(promoCodigo)) {
      const errorCodigo = new Error('El código ingresado no es válido o ya venció.');
      errorCodigo.codigoInvalido = true;
      throw errorCodigo;
    }
    promos.push(promoCodigo);
  }

  return promos;
}

export function calcularDescuentos(itemsDetallados, promos) {
  const items = itemsDetallados.map((it) => ({ ...it, descuento: 0 }));
  const detallePromos = [];
  const soloOficiales = (lista) => lista.filter((it) => it.tipo === 'oficial');

  for (const promo of promos) {
    if (promo.tipo === '2X1') {
      if (!promo.producto_id) continue;
      const coincidencias = soloOficiales(items).filter((it) => String(it.id) === String(promo.producto_id));
      if (!coincidencias.length) continue;

      const cantidadTotal = coincidencias.reduce((acc, it) => acc + it.cantidad, 0);
      const gratisEquivalentes = Math.floor(cantidadTotal / 2);
      if (gratisEquivalentes <= 0) continue;

      const precioUnitario = coincidencias[0].precioUnitario;
      const descuentoTotalPromo = gratisEquivalentes * precioUnitario;

      coincidencias.forEach((it) => {
        const proporcion = it.cantidad / cantidadTotal;
        it.descuento += descuentoTotalPromo * proporcion;
      });

      detallePromos.push({
        codigo: promo.codigo || null, nombre: promo.nombre, tipo: '2X1',
        descuento: Math.round(descuentoTotalPromo * 100) / 100,
      });
    } else if (promo.tipo === 'NXPRECIO') {
      if (!promo.producto_id) continue;
      const cantidadPack = Math.max(2, Math.floor(Number(promo.cantidad) || 0));
      const precioPack = Number(promo.valor) || 0;
      if (cantidadPack < 2 || precioPack <= 0) continue;

      const coincidencias = soloOficiales(items).filter((it) => String(it.id) === String(promo.producto_id));
      if (!coincidencias.length) continue;

      const cantidadTotal = coincidencias.reduce((acc, it) => acc + it.cantidad, 0);
      const packsCompletos = Math.floor(cantidadTotal / cantidadPack);
      if (packsCompletos <= 0) continue;

      const precioUnitario = coincidencias[0].precioUnitario;
      const precioNormalPacks = packsCompletos * cantidadPack * precioUnitario;
      const descuentoTotalPromo = Math.max(0, precioNormalPacks - packsCompletos * precioPack);
      if (descuentoTotalPromo <= 0) continue;

      coincidencias.forEach((it) => {
        const proporcion = it.cantidad / cantidadTotal;
        it.descuento += descuentoTotalPromo * proporcion;
      });

      detallePromos.push({
        codigo: promo.codigo || null, nombre: promo.nombre, tipo: 'NXPRECIO',
        descuento: Math.round(descuentoTotalPromo * 100) / 100,
      });
    } else if (promo.tipo === 'PORCENTAJE') {
      const pct = Number(promo.valor) || 0;
      if (pct <= 0) continue;

      const itemsAfectados = promo.alcance === 'PRODUCTO' && promo.producto_id
        ? soloOficiales(items).filter((it) => String(it.id) === String(promo.producto_id))
        : soloOficiales(items);
      if (!itemsAfectados.length) continue;

      let descuentoTotalPromo = 0;
      itemsAfectados.forEach((it) => {
        const baseRestante = Math.max(0, it.subtotal - it.descuento);
        const d = baseRestante * (pct / 100);
        it.descuento += d;
        descuentoTotalPromo += d;
      });

      detallePromos.push({
        codigo: promo.codigo || null, nombre: promo.nombre, tipo: 'PORCENTAJE', valor: pct,
        descuento: Math.round(descuentoTotalPromo * 100) / 100,
      });
    }
  }

  items.forEach((it) => {
    it.descuento = Math.min(it.descuento, it.subtotal);
    it.descuento = Math.round(it.descuento * 100) / 100;
    it.subtotalFinal = Math.round((it.subtotal - it.descuento) * 100) / 100;
  });

  const descuentoTotalGeneral = Math.round(items.reduce((acc, it) => acc + it.descuento, 0) * 100) / 100;

  return { items, descuentoTotalGeneral, detallePromos };
}

export function aplicarDescuentoAGrupos(grupos, itemsConDescuento) {
  const montoPorGrupo = {};
  itemsConDescuento.forEach((it) => {
    montoPorGrupo[it.grupoId] = (montoPorGrupo[it.grupoId] || 0) + it.subtotalFinal;
  });
  grupos.forEach((g) => {
    g.monto = Math.round((montoPorGrupo[g.vendorId] || 0) * 100) / 100;
  });
  const totalFinal = Math.round(itemsConDescuento.reduce((acc, it) => acc + it.subtotalFinal, 0) * 100) / 100;
  return totalFinal;
}
