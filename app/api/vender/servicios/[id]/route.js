import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';
import { esUrlImagenPropia } from '@/lib/storage';
import { obtenerConfig } from '@/lib/config';
import { notificarAdminServicioEditado } from '@/lib/vendorNotify';

async function obtenerServicioPropio(dni, id) {
  const { data } = await supabaseAdmin.from('servicios_socios').select('*').eq('id', id).eq('dni_socio', dni).maybeSingle();
  if (!data) throw new Error('No encontramos ese servicio o no te pertenece.');
  return data;
}

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    const dni = resolverDniDesdeRequest(request);
    const servicio = await obtenerServicioPropio(dni, params.id);
    const cambios = await request.json();
    const update = {};

    if (cambios.hasOwnProperty('disponible')) update.disponible = !!cambios.disponible;
    if (cambios.hasOwnProperty('activo')) update.activo = !!cambios.activo;
    if (cambios.hasOwnProperty('destacado')) update.destacado = !!cambios.destacado;

    const { error } = await supabaseAdmin.from('servicios_socios').update(update).eq('id', servicio.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}

export async function PUT(request, contexto) {
  try {
    const params = await contexto.params;
    const dni = resolverDniDesdeRequest(request);
    const servicio = await obtenerServicioPropio(dni, params.id);
    const datos = await request.json();
    if (datos.tcf_hp) throw new Error('No se pudo procesar la solicitud.');

    const rubro = String(datos.rubro || '').trim();
    if (rubro.length < 2) throw new Error('Ingresá un rubro válido.');

    const update = {
      rubro: rubro.substring(0, 100),
      descripcion: String(datos.descripcion || '').trim().substring(0, 1000),
      zona_cobertura: String(datos.zonaCobertura || '').trim().substring(0, 200),
      horario_atencion: String(datos.horarioAtencion || '').trim().substring(0, 150),
      dias: String(datos.dias || '').trim().substring(0, 150),
      full_time: !!datos.fullTime,
      urgencias: !!datos.urgencias,
    };

    if (Array.isArray(datos.imagenes) && datos.imagenes.length) {
      const urls = datos.imagenes.filter((u) => esUrlImagenPropia(u)).slice(0, 6);
      if (urls.length) update.imagenes = urls;
    }

    let requiereReaprobacion = false;
    if (servicio.aprobado) { update.aprobado = false; requiereReaprobacion = true; }

    const { error } = await supabaseAdmin.from('servicios_socios').update(update).eq('id', servicio.id);
    if (error) throw new Error(error.message);

    if (requiereReaprobacion) {
      try {
        const config = await obtenerConfig();
        const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', dni).maybeSingle();
        await notificarAdminServicioEditado(config, socio, rubro);
      } catch (e) { }
    }

    return NextResponse.json({ ok: true, requiereReaprobacion });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
