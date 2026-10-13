import { NextResponse } from 'next/server';
import { obtenerDatosTienda } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const datos = await obtenerDatosTienda();
    return NextResponse.json(datos, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudo cargar la tienda.' }, { status: 500 });
  }
}
