import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { obtenerConfig } from '@/lib/config';
import { notificarSocioServicioAprobado } from '@/lib/adminNotify';

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    resolverAdminDesdeRequest(request);
    const cambios = await request.json();
    if (!cambios) throw new Error('Datos inválidos.');

    const { data: serv } = await supabaseAdmin.from('servicios_socios').select('*').eq('id', params.id).maybeSingle();
    if (!serv) throw new Error('Servicio no encontrado.');

    const update = {};
    if (cambios.hasOwnProperty('aprobado')) update.aprobado = !!cambios.aprobado;
    if (cambios.hasOwnProperty('activo')) update.activo = !!cambios.activo;

    const { error } = await supabaseAdmin.from('servicios_socios').update(update).eq('id', params.id);
    if (error) throw new Error(error.message);

    if (cambios.aprobado === true) {
      try {
        const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', serv.dni_socio).maybeSingle();
        const config = await obtenerConfig();
        await notificarSocioServicioAprobado(config, socio, serv.rubro);
      } catch (e) { }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
