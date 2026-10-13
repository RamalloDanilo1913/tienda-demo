import { verificarSesion } from './session';

export function resolverDniDesdeRequest(request) {
  const cookie = request.cookies.get('vendor_session');
  const payload = cookie ? verificarSesion(cookie.value) : null;
  if (!payload || !payload.dni) {
    const err = new Error('Tu sesión expiró. Volvé a ingresar tu DNI y tu clave.');
    err.status = 401;
    throw err;
  }
  return payload.dni;
}
