import { NextResponse } from 'next/server';
import { validarDatosComprador } from '@/lib/validaciones';
import { procesarItemsYStock, generarIdPedido } from '@/lib/pedidos';
import { esPathComprobantePropio, comprobanteExiste } from '@/lib/storage';
import { obtenerConfig } from '@/lib/config';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { enviarEmailsPedido } from '@/lib/emailTemplates';
import { obtenerPromosAplicables, calcularDescuentos, aplicarDescuentoAGrupos } from '@/lib/promos';
import { mensajePublico } from '@/lib/util';
import { verificarLimiteIntentos, registrarIntentoFallido, ipDesdeRequest } from '@/lib/rateLimit';

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ ok: false, mensaje: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, mensaje: 'Payload inválido.' }, { status: 400 });
  }
  if (payload.tcf_hp) {
    return NextResponse.json({ ok: false, mensaje: 'No se pudo procesar la solicitud.' }, { status: 400 });
  }

  const claveIntentosPromo = 'promo:' + ipDesdeRequest(request);

  try {
    if (payload.codigoPromo) await verificarLimiteIntentos(claveIntentosPromo, 10);
    const datosComprador = validarDatosComprador(payload);
    let promos = [];
    try {
      promos = await obtenerPromosAplicables(payload.codigoPromo);
    } catch (errPromo) {
      if (payload.codigoPromo) {
        if (errPromo.codigoInvalido) {
          try { await registrarIntentoFallido(claveIntentosPromo, 10, 600); } catch (e) { }
        }
        throw errPromo;
      }
      console.error('Error leyendo promociones automáticas:', errPromo.message);
    }

    const resultado = await procesarItemsYStock(payload.items);
    const idPedido = generarIdPedido();

    let descuentoTotal = 0;
    let detallePromos = [];
    try {
      const calculo = calcularDescuentos(resultado.itemsDetallados, promos);
      resultado.itemsDetallados = calculo.items;
      descuentoTotal = calculo.descuentoTotalGeneral;
      detallePromos = calculo.detallePromos;
      resultado.total = aplicarDescuentoAGrupos(resultado.grupos, calculo.items);
    } catch (errPromo) {
      console.error('Error aplicando promociones:', errPromo.message);
    }

    const pagosEnviados = {};
    (Array.isArray(payload.pagos) ? payload.pagos : []).forEach((p) => {
      if (p && typeof p === 'object') pagosEnviados[String(p.vendorId)] = p.comprobantePath;
    });

    for (const g of resultado.grupos) {
      const path = pagosEnviados[g.vendorId];
      g.comprobanteUrl = '';
      if (path && esPathComprobantePropio(path)) {
        try {
          if (await comprobanteExiste(path)) g.comprobanteUrl = path;
        } catch (e) {
          console.error('Error verificando comprobante:', e.message);
        }
      }
      g.comprobanteRecibido = !!g.comprobanteUrl;
    }

    const todosOk = resultado.grupos.every((g) => g.comprobanteRecibido);

    const { error: insertError } = await supabaseAdmin.from('pedidos').insert({
      id: idPedido,
      nombre: datosComprador.nombre,
      dni: datosComprador.dni,
      telefono: datosComprador.telefono,
      direccion: datosComprador.direccion,
      email: datosComprador.email,
      items: resultado.itemsDetallados,
      total: resultado.total,
      pagos: resultado.grupos,
      estado: todosOk ? 'Comprobantes recibidos' : 'Pendiente de comprobante(s)',
      codigo_promo: payload.codigoPromo ? String(payload.codigoPromo).trim().toUpperCase().substring(0, 50) : null,
      descuento_total: descuentoTotal,
      detalle_promos: detallePromos,
    });
    if (insertError) throw new Error('Error guardando el pedido: ' + insertError.message);

    const config = await obtenerConfig();
    resultado.descuentoTotal = descuentoTotal;
    await enviarEmailsPedido(datosComprador, resultado, idPedido, config);

    return NextResponse.json({
      ok: true,
      idPedido,
      total: resultado.total,
      descuentoTotal,
      grupos: resultado.grupos.map((g) => ({
        vendorId: g.vendorId,
        nombre: g.nombre,
        telefono: g.telefono,
        esSocio: g.vendorId !== 'CLUB',
        comprobanteRecibido: g.comprobanteRecibido,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, mensaje: mensajePublico(err) },
      { status: 400 }
    );
  }
}
