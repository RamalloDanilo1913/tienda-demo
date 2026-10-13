import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';
import { esUrlImagenPropia } from '@/lib/storage';
import { obtenerConfig } from '@/lib/config';
import { notificarAdminNuevoServicio } from '@/lib/vendorNotify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const { data, error } = await supabaseAdmin
      .from('servicios_socios').select('*').eq('dni_socio', dni).order('creado_en', { ascending: false });
    if (error) throw new Error(error.message);

    const servicios = (data || []).map((s) => ({
      id: s.id,
      rubro: s.rubro,
      descripcion: s.descripcion || '',
      zonaCobertura: s.zona_cobertura || '',
      horarioAtencion: s.horario_atencion || '',
      dias: s.dias || '',
      fullTime: !!s.full_time,
      urgencias: !!s.urgencias,
      disponible: !!s.disponible,
      activo: !!s.activo,
      aprobado: !!s.aprobado,
    }));
    return NextResponse.json(servicios);
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const datos = await request.json();
    if (!datos) throw new Error('Datos inválidos.');
    if (datos.tcf_hp) throw new Error('No se pudo procesar la solicitud.');

    const rubro = String(datos.rubro || '').trim();
    if (rubro.length < 2) throw new Error('Ingresá un rubro válido.');

    const urls = Array.isArray(datos.imagenes)
      ? datos.imagenes.filter((u) => esUrlImagenPropia(u)).slice(0, 6)
      : [];

    const { error } = await supabaseAdmin.from('servicios_socios').insert({
      dni_socio: dni,
      rubro: rubro.substring(0, 100),
      descripcion: String(datos.descripcion || '').trim().substring(0, 1000),
      zona_cobertura: String(datos.zonaCobertura || '').trim().substring(0, 200),
      horario_atencion: String(datos.horarioAtencion || '').trim().substring(0, 150),
      dias: String(datos.dias || '').trim().substring(0, 150),
      full_time: !!datos.fullTime,
      urgencias: !!datos.urgencias,
      disponible: true,
      imagenes: urls,
      aprobado: false, activo: true, destacado: false,
    });
    if (error) throw new Error(error.message);

    try {
      const config = await obtenerConfig();
      const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', dni).maybeSingle();
      await notificarAdminNuevoServicio(config, socio, rubro);
    } catch (e) { }

    return NextResponse.json({ ok: true, mensaje: '¡Servicio enviado! Quedó pendiente de aprobación por la administración.' });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
