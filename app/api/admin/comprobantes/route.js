import { NextResponse } from 'next/server';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { obtenerUrlComprobante, esPathComprobantePropio } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const path = request.nextUrl.searchParams.get('path');
    if (!path || !esPathComprobantePropio(path)) throw new Error('Path de comprobante inválido.');
    const url = await obtenerUrlComprobante(path);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
