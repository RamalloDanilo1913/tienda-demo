import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', dni).maybeSingle();
    if (!socio || !socio.activo) {
      const err = new Error('Tu sesión expiró. Volvé a ingresar tu DNI y tu clave.');
      err.status = 401;
      throw err;
    }
    const tipo = socio.tipo === 'Servicio' ? 'Servicio' : 'Producto';
    return NextResponse.json({ ok: true, nombre: `${socio.nombre} ${socio.apellido}`.trim(), tipo });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 401 });
  }
}
