import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { hashearClave } from '@/lib/crypto';
import { normalizarDni } from '@/lib/util';
import { avisarVendedorAprobado } from '@/lib/avisarAprobacion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const { data, error } = await supabaseAdmin.from('socios').select('*').order('nombre');
    if (error) throw new Error(error.message);

    return NextResponse.json((data || []).map((s) => ({
      dni: s.dni,
      nombre: s.nombre || '',
      apellido: s.apellido || '',
      email: s.email || '',
      telefono: s.telefono || '',
      aliasMP: s.alias_mp || '',
      cbu: s.cbu_cvu || '',
      tipo: s.tipo || 'Producto',
      activo: !!s.activo,
    })));
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    resolverAdminDesdeRequest(request);
    const datos = await request.json();
    if (!datos) throw new Error('Datos inválidos.');

    const dni = normalizarDni(datos.dni);
    if (dni.length < 6) throw new Error('DNI inválido.');
    const nombre = String(datos.nombre || '').trim();
    const apellido = String(datos.apellido || '').trim();
    if (!nombre || !apellido) throw new Error('Nombre y apellido requeridos.');
    let tipo = String(datos.tipo || 'Producto').trim();
    if (tipo !== 'Producto' && tipo !== 'Servicio') tipo = 'Producto';

    const { data: existente } = await supabaseAdmin.from('socios').select('*').eq('dni', dni).maybeSingle();

    const registro = {
      nombre: nombre.substring(0, 80),
      apellido: apellido.substring(0, 80),
      email: String(datos.email || '').substring(0, 120),
      telefono: String(datos.telefono || '').substring(0, 30),
      alias_mp: String(datos.aliasMP || '').substring(0, 80),
      cbu_cvu: String(datos.cbu || '').substring(0, 30),
      activo: !!datos.activo,
      tipo,
    };

    if (datos.nuevaClave && String(datos.nuevaClave).length >= 6) {
      registro.clave_hash = await hashearClave(String(datos.nuevaClave).substring(0, 200));
    }

    if (existente) {
      const { error } = await supabaseAdmin.from('socios').update(registro).eq('dni', dni);
      if (error) throw new Error(error.message);
    } else {
      if (!datos.nuevaClave || String(datos.nuevaClave).length < 6) {
        throw new Error('La clave inicial debe tener al menos 6 caracteres.');
      }
      const { error } = await supabaseAdmin.from('socios').insert({ dni, ...registro });
      if (error) throw new Error(error.message);
    }

    try {
      await avisarVendedorAprobado(dni, !!datos.activo, tipo.toUpperCase());
    } catch (e) { }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
