import { firmarSesion, verificarSesion } from './session';
import { sha256Hex, igualesSeguro, esHashScrypt, verificarClaveScrypt } from './crypto';

const ADMIN_HASH_ITERACIONES = 10000;

export function obtenerAdminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

export function esAdmin(email) {
  if (!email) return false;
  const e = String(email).toLowerCase().trim();
  return obtenerAdminEmails().includes(e);
}

export function hashAdminClaveLegacy(clave, salt) {
  let valor = String(salt) + ':' + String(clave);
  for (let i = 0; i < ADMIN_HASH_ITERACIONES; i++) {
    valor = sha256Hex(valor + ':' + salt);
  }
  return valor;
}

export async function verificarClaveAdmin(clave, fila) {
  if (!fila || !fila.clave_hash) return { ok: false, necesitaActualizar: false };
  const almacenado = String(fila.clave_hash).trim();
  if (esHashScrypt(almacenado)) {
    return { ok: await verificarClaveScrypt(clave, almacenado), necesitaActualizar: false };
  }
  const ok = igualesSeguro(hashAdminClaveLegacy(clave, fila.salt || ''), almacenado);
  return { ok, necesitaActualizar: ok };
}

export function firmarSesionAdmin(email) {
  return firmarSesion({ email }, 1200);
}

export function resolverAdminDesdeRequest(request) {
  const cookie = request.cookies.get('admin_session');
  const payload = cookie ? verificarSesion(cookie.value) : null;
  if (!payload || !payload.email || !esAdmin(payload.email)) {
    const err = new Error('Sesión inválida o expirada. Volvé a iniciar sesión.');
    err.status = 401;
    throw err;
  }
  return payload.email;
}
