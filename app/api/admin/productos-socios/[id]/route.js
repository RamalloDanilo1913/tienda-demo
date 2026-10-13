import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { obtenerConfig } from '@/lib/config';
import { notificarSocioProductoAprobado } from '@/lib/adminNotify';

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    resolverAdminDesdeRequest(request);
    const cambios = await request.json();
    if (!cambios) throw new Error('Datos inválidos.');

    const { data: prod } = await supabaseAdmin.from('productos_socios').select('*').eq('id', params.id).maybeSingle();
    if (!prod) throw new Error('Producto no encontrado.');

    const update = {};
    if (cambios.hasOwnProperty('aprobado')) update.aprobado = !!cambios.aprobado;
    if (cambios.hasOwnProperty('activo')) update.activo = !!cambios.activo;
    if (cambios.hasOwnProperty('destacado')) update.destacado = !!cambios.destacado;

    const { error } = await supabaseAdmin.from('productos_socios').update(update).eq('id', params.id);
    if (error) throw new Error(error.message);

    if (cambios.aprobado === true) {
      try {
        const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', prod.dni_socio).maybeSingle();
        const config = await obtenerConfig();
        await notificarSocioProductoAprobado(config, socio, prod.nombre);
      } catch (e) { }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
