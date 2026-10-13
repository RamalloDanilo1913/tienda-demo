import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const { data, error } = await supabaseAdmin.from('config').select('*');
    if (error) throw new Error(error.message);
    const config = {};
    (data || []).forEach((row) => { if (row.clave) config[row.clave] = row.valor || ''; });
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    resolverAdminDesdeRequest(request);
    const cambios = await request.json();
    if (!cambios || typeof cambios !== 'object') throw new Error('Datos inválidos.');

    for (const clave of Object.keys(cambios)) {
      const { error } = await supabaseAdmin
        .from('config')
        .upsert({ clave, valor: String(cambios[clave] ?? '') }, { onConflict: 'clave' });
      if (error) throw new Error(`Error guardando "${clave}": ` + error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
