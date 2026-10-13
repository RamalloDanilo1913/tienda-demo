export function normalizarDni(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw).replace(/\D/g, '');
}

const PATRON_ERROR_INTERNO = /^Error (leyendo|guardando|actualizando|consultando|validando|subiendo|generando)|fetch failed|ECONN|ETIMEDOUT|supabase|postgres|violates|relation "/i;

export function mensajePublico(err, porDefecto = 'No se pudo procesar. Probá de nuevo.') {
  const mensaje = String((err && err.message) || '');
  if (!mensaje || PATRON_ERROR_INTERNO.test(mensaje)) return porDefecto;
  return mensaje;
}
