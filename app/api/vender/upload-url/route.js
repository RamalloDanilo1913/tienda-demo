import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

export async function POST(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const { prefijo, extension } = await request.json();

    let ext = String(extension || 'jpg').toLowerCase().replace(/[^a-z]/g, '');
    if (ext === 'jpeg') ext = 'jpg';
    if (!EXTENSIONES_PERMITIDAS.includes(ext)) ext = 'jpg';

    const sufijo = String(prefijo || 'img').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
    const nombre = `socio_${dni}_${sufijo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await supabaseAdmin
      .storage
      .from('productos-imagenes')
      .createSignedUploadUrl(nombre);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, path: data.path, token: data.token });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 401 });
  }
}
