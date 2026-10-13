import supabaseAdmin from './supabaseAdmin';
import { decodificarArchivo } from './validaciones';

function extensionDesdeMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('pdf')) return 'pdf';
  return 'bin';
}

export async function guardarComprobante(archivo, etiqueta) {
  const buffer = decodificarArchivo(archivo);
  const ext = extensionDesdeMime(archivo.mimeType);
  const nombre = `Comprobante_${etiqueta}_${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin
    .storage
    .from('comprobantes')
    .upload(nombre, buffer, { contentType: archivo.mimeType || 'application/octet-stream' });

  if (error) throw new Error('Error subiendo comprobante: ' + error.message);
  return nombre;
}

export async function guardarImagenProducto(archivo, prefijo) {
  const buffer = decodificarArchivo(archivo);
  const ext = extensionDesdeMime(archivo.mimeType);
  const nombre = `${prefijo}_${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin
    .storage
    .from('productos-imagenes')
    .upload(nombre, buffer, { contentType: archivo.mimeType || 'application/octet-stream' });

  if (error) throw new Error('Error subiendo imagen: ' + error.message);

  const { data } = supabaseAdmin.storage.from('productos-imagenes').getPublicUrl(nombre);
  return data.publicUrl;
}

const PREFIJO_URL_PRODUCTOS = (process.env.SUPABASE_URL || '') + '/storage/v1/object/public/productos-imagenes/';
export function esUrlImagenPropia(url) {
  return typeof url === 'string' && url.length > PREFIJO_URL_PRODUCTOS.length && url.startsWith(PREFIJO_URL_PRODUCTOS);
}

export async function obtenerUrlComprobante(path) {
  const { data, error } = await supabaseAdmin.storage.from('comprobantes').createSignedUrl(path, 300);
  if (error) throw new Error('Error generando el link del comprobante: ' + error.message);
  return data.signedUrl;
}

const REGEX_PATH_COMPROBANTE = /^Comprobante_[A-Za-z0-9_-]+_\d+_[a-z0-9]+\.(jpg|jpeg|png|webp|gif|pdf)$/;
export function esPathComprobantePropio(path) {
  return typeof path === 'string' && REGEX_PATH_COMPROBANTE.test(path);
}

export async function comprobanteExiste(path) {
  const { error } = await supabaseAdmin.storage.from('comprobantes').createSignedUrl(path, 10);
  return !error;
}
