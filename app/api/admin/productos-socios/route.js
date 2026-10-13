import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const [prodRes, socRes] = await Promise.all([
      supabaseAdmin.from('productos_socios').select('*').order('creado_en', { ascending: false }),
      supabaseAdmin.from('socios').select('dni,nombre,apellido'),
    ]);
    if (prodRes.error) throw new Error(prodRes.error.message);

    const nombrePorDni = {};
    (socRes.data || []).forEach((s) => { nombrePorDni[s.dni] = `${s.nombre || ''} ${s.apellido || ''}`.trim(); });

    return NextResponse.json((prodRes.data || []).map((p) => ({
      id: p.id,
      dni: p.dni_socio,
      socioNombre: nombrePorDni[p.dni_socio] || `DNI ${p.dni_socio}`,
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio: Number(p.precio) || 0,
      stock: Number(p.stock) || 0,
      talles: (p.talles || []).join(','),
      colores: (p.colores || []).join(','),
      imagenesURL: (p.imagenes || []).join(', '),
      aprobado: !!p.aprobado,
      activo: !!p.activo,
      destacado: !!p.destacado,
      fecha: p.creado_en ? new Date(p.creado_en).toLocaleDateString('es-AR') : '',
    })));
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}
