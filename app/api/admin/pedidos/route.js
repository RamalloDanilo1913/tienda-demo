import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const { data, error } = await supabaseAdmin.from('pedidos').select('*').order('fecha', { ascending: false });
    if (error) throw new Error(error.message);

    return NextResponse.json((data || []).map((r) => ({
      id: r.id,
      fecha: r.fecha ? new Date(r.fecha).toLocaleDateString('es-AR') : '',
      nombre: r.nombre || '',
      dni: r.dni || '',
      telefono: r.telefono || '',
      direccion: r.direccion || '',
      email: r.email || '',
      total: Number(r.total) || 0,
      estado: r.estado || '',
      items: r.items || [],
      pagos: r.pagos || [],
    })));
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}
