import supabaseAdmin from './supabaseAdmin';

export async function verificarLimiteIntentos(clave, maxIntentos = 6) {
  const { data } = await supabaseAdmin.from('login_attempts').select('*').eq('clave', clave).maybeSingle();
  if (data && data.bloqueado_hasta && new Date(data.bloqueado_hasta) > new Date()) {
    throw new Error('Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.');
  }
}

export async function registrarIntentoFallido(clave, maxIntentos = 6, bloqueoSegundos = 600) {
  const { data } = await supabaseAdmin.from('login_attempts').select('*').eq('clave', clave).maybeSingle();
  const intentos = (data?.intentos || 0) + 1;
  const bloqueado_hasta = intentos >= maxIntentos ? new Date(Date.now() + bloqueoSegundos * 1000).toISOString() : null;
  await supabaseAdmin.from('login_attempts').upsert({ clave, intentos, bloqueado_hasta });
}

export function ipDesdeRequest(request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || 'desconocida';
  return ip.substring(0, 60);
}

export async function limpiarIntentos(clave) {
  await supabaseAdmin.from('login_attempts').delete().eq('clave', clave);
}
