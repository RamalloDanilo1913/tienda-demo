export function validarDatosComprador(payload) {
  const nombre    = String(payload.nombre    || '').trim();
  const dni       = String(payload.dni       || '').replace(/\D/g, '');
  const telefono  = String(payload.telefono  || '').trim();
  const direccion = String(payload.direccion || '').trim();
  const email     = String(payload.email     || '').trim();

  if (nombre.length < 3) throw new Error('Ingresá tu nombre y apellido completo.');
  if (dni.length < 7 || dni.length > 9) throw new Error('Ingresá un DNI válido.');
  if (telefono.replace(/\D/g, '').length < 8) throw new Error('Ingresá un teléfono de contacto válido.');
  if (direccion.length < 5) throw new Error('Ingresá una dirección de entrega válida.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ingresá un correo electrónico válido.');

  return {
    nombre: nombre.substring(0, 150),
    dni,
    telefono: telefono.substring(0, 30),
    direccion: direccion.substring(0, 250),
    email: email.substring(0, 150),
  };
}

export function validarArchivo(archivo, prefijosPermitidos, maxBytes) {
  if (!archivo || !archivo.data) throw new Error('Archivo inválido.');
  const mime = String(archivo.mimeType || '');
  if (!prefijosPermitidos.some((p) => mime.indexOf(p) === 0)) {
    throw new Error('Tipo de archivo no permitido.');
  }
  const base64 = String(archivo.data).split(',').pop();
  if (Math.floor((base64.length * 3) / 4) > maxBytes) {
    throw new Error('El archivo es demasiado pesado.');
  }
}

export function decodificarArchivo(archivo) {
  const partes = String(archivo.data || '').split(',');
  const base64 = partes.length > 1 ? partes[1] : partes[0];
  return Buffer.from(base64, 'base64');
}
