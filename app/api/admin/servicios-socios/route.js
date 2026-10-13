import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const [servRes, socRes] = await Promise.all([
      supabaseAdmin.from('servicios_socios').select('*').order('creado_en', { ascending: false }),
      supabaseAdmin.from('socios').select('dni,nombre,apellido'),
    ]);
    if (servRes.error) throw new Error(servRes.error.message);

    const nombrePorDni = {};
    (socRes.data || []).forEach((s) => { nombrePorDni[s.dni] = `${s.nombre || ''} ${s.apellido || ''}`.trim(); });

    return NextResponse.json((servRes.data || []).map((s) => ({
      id: s.id,
      dni: s.dni_socio,
      socioNombre: nombrePorDni[s.dni_socio] || `DNI ${s.dni_socio}`,
      rubro: s.rubro || '',
      descripcion: s.descripcion || '',
      zonaCobertura: s.zona_cobertura || '',
      horarioAtencion: s.horario_atencion || '',
      dias: s.dias || '',
      fullTime: !!s.full_time,
      urgencias: !!s.urgencias,
      disponible: !!s.disponible,
      imagenesURL: (s.imagenes || []).join(', '),
      aprobado: !!s.aprobado,
      activo: !!s.activo,
      fecha: s.creado_en ? new Date(s.creado_en).toLocaleDateString('es-AR') : '',
    })));
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}
