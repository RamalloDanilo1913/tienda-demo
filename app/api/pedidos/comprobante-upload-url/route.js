import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];

export async function POST(request) {
  try {
    const { vendorId, extension, tcf_hp } = await request.json();
    if (tcf_hp) throw new Error('No se pudo procesar la solicitud.');

    let ext = String(extension || 'jpg').toLowerCase().replace(/[^a-z]/g, '');
    if (ext === 'jpeg') ext = 'jpg';
    if (!EXTENSIONES_PERMITIDAS.includes(ext)) ext = 'jpg';

    const vendorSeguro = String(vendorId || 'pago').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'pago';
    const nombre = `Comprobante_${vendorSeguro}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data, error } = await supabaseAdmin
      .storage
      .from('comprobantes')
      .createSignedUploadUrl(nombre);

    if (error) {
      console.error('Error generando URL de subida de comprobante:', error.message);
      throw new Error('No se pudo iniciar la subida del comprobante.');
    }

    return NextResponse.json({ ok: true, path: data.path, token: data.token });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
