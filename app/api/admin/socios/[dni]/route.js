import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { avisarVendedorAprobado } from '@/lib/avisarAprobacion';

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    resolverAdminDesdeRequest(request);
    const { activo } = await request.json();
    const { data: socio } = await supabaseAdmin.from('socios').select('dni,tipo').eq('dni', params.dni).maybeSingle();
    if (!socio) throw new Error('Socio no encontrado.');
    const { error } = await supabaseAdmin.from('socios').update({ activo: !!activo }).eq('dni', params.dni);
    if (error) throw new Error(error.message);

    try {
      const tipo = (socio.tipo || 'Producto').toUpperCase();
      await avisarVendedorAprobado(params.dni, !!activo, tipo);
    } catch (e) { }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
