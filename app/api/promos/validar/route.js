import { NextResponse } from 'next/server';
import { procesarItemsYStockSoloLectura } from '@/lib/pedidos';
import { obtenerPromosAplicables, calcularDescuentos } from '@/lib/promos';
import { mensajePublico } from '@/lib/util';
import { verificarLimiteIntentos, registrarIntentoFallido, ipDesdeRequest } from '@/lib/rateLimit';

export async function POST(request) {
  const claveIntentos = 'promo:' + ipDesdeRequest(request);
  try {
    let cuerpo;
    try { cuerpo = await request.json(); } catch (e) { throw new Error('Solicitud inválida.'); }
    const { codigo, items } = cuerpo || {};
    await verificarLimiteIntentos(claveIntentos, 10);
    const itemsDetallados = await procesarItemsYStockSoloLectura(items);
    const promos = await obtenerPromosAplicables(codigo);
    const calculo = calcularDescuentos(itemsDetallados, promos);
    return NextResponse.json({
      ok: true,
      descuentoTotal: calculo.descuentoTotalGeneral,
      detallePromos: calculo.detallePromos,
    });
  } catch (err) {
    if (err.codigoInvalido) {
      try { await registrarIntentoFallido(claveIntentos, 10, 600); } catch (e) { }
    }
    return NextResponse.json({ ok: false, mensaje: mensajePublico(err) }, { status: 400 });
  }
}
