import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { firmarSesion } from '@/lib/session';
import { hashearClave, verificarClaveSocio } from '@/lib/crypto';
import { verificarLimiteIntentos, registrarIntentoFallido, limpiarIntentos } from '@/lib/rateLimit';
import { normalizarDni } from '@/lib/util';

const MENSAJE_CREDENCIALES = 'DNI o clave incorrectos.';

export async function POST(request) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch (e) {
    return NextResponse.json({ ok: false, mensaje: 'Solicitud inválida.' }, { status: 400 });
  }

  const dniLimpio = normalizarDni(cuerpo && cuerpo.dni);
  const clave = String((cuerpo && cuerpo.clave) || '').substring(0, 200);

  if (dniLimpio.length < 7 || dniLimpio.length > 9) {
    return NextResponse.json({ ok: false, mensaje: 'Ingresá un DNI válido.' });
  }

  try {
    await verificarLimiteIntentos(dniLimpio);
  } catch (e) {
    return NextResponse.json({ ok: false, mensaje: e.message });
  }

  const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', dniLimpio).maybeSingle();

  if (!socio || !socio.activo) {
    await registrarIntentoFallido(dniLimpio);
    return NextResponse.json({ ok: false, mensaje: MENSAJE_CREDENCIALES });
  }
  if (!socio.clave_hash) {
    return NextResponse.json({ ok: false, mensaje: 'Tu cuenta todavía no tiene una clave configurada. Contactá a la administración.' });
  }

  const verificacion = await verificarClaveSocio(clave, socio.clave_hash);
  if (!verificacion.ok) {
    await registrarIntentoFallido(dniLimpio);
    return NextResponse.json({ ok: false, mensaje: MENSAJE_CREDENCIALES });
  }

  if (verificacion.necesitaActualizar) {
    try {
      const nuevoHash = await hashearClave(clave);
      await supabaseAdmin.from('socios').update({ clave_hash: nuevoHash }).eq('dni', dniLimpio);
    } catch (e) {
      console.error('No se pudo actualizar el hash de la clave de un socio.');
    }
  }

  await limpiarIntentos(dniLimpio);
  const token = firmarSesion({ dni: dniLimpio }, 1200);
  const tipoSocio = socio.tipo === 'Servicio' ? 'Servicio' : 'Producto';

  const res = NextResponse.json({
    ok: true,
    nombre: `${socio.nombre} ${socio.apellido}`.trim(),
    tipo: tipoSocio,
  });
  res.cookies.set('vendor_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 1200,
  });
  return res;
}
