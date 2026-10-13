import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { esAdmin, verificarClaveAdmin, firmarSesionAdmin } from '@/lib/adminAuth';
import { hashearClave } from '@/lib/crypto';
import { verificarLimiteIntentos, registrarIntentoFallido, limpiarIntentos } from '@/lib/rateLimit';

export async function POST(request) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch (e) {
    return NextResponse.json({ ok: false, mensaje: 'Solicitud inválida.' }, { status: 400 });
  }

  const email = String((cuerpo && cuerpo.email) || '').toLowerCase().trim().substring(0, 150);
  const claveStr = String((cuerpo && cuerpo.clave) || '').substring(0, 200);
  if (!email || !claveStr) {
    return NextResponse.json({ ok: false, mensaje: 'Completá email y clave.' });
  }

  const claveIntentos = 'admin:' + email;
  try {
    await verificarLimiteIntentos(claveIntentos, 5);
  } catch (e) {
    return NextResponse.json({ ok: false, mensaje: e.message });
  }

  const { data: fila } = await supabaseAdmin.from('admin_claves').select('*').eq('email', email).maybeSingle();
  const verificacion = await verificarClaveAdmin(claveStr, fila);
  const esValido = esAdmin(email) && !!fila && verificacion.ok;

  if (!esValido) {
    await registrarIntentoFallido(claveIntentos, 5, 900);
    return NextResponse.json({ ok: false, mensaje: 'Credenciales inválidas.' });
  }

  if (verificacion.necesitaActualizar) {
    try {
      const nuevoHash = await hashearClave(claveStr);
      await supabaseAdmin.from('admin_claves').update({ clave_hash: nuevoHash }).eq('email', email);
    } catch (e) {
      console.error('No se pudo actualizar el hash de la clave de admin.');
    }
  }

  await limpiarIntentos(claveIntentos);
  const token = firmarSesionAdmin(email);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 1200,
  });
  return res;
}
