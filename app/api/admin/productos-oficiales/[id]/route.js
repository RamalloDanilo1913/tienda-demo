import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    resolverAdminDesdeRequest(request);
    const { data: prod } = await supabaseAdmin.from('productos_oficiales').select('id').eq('id', params.id).maybeSingle();
    if (!prod) throw new Error('Producto no encontrado.');
    const { error } = await supabaseAdmin.from('productos_oficiales').update({ activo: false }).eq('id', params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
