import supabaseBrowser from './supabaseBrowser';

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'productos-imagenes';

function extensionDeArchivo(file) {
  const porMime = (file.type || '').split('/')[1];
  if (porMime) return porMime === 'jpeg' ? 'jpg' : porMime;
  const porNombre = String(file.name || '').split('.').pop();
  return porNombre || 'jpg';
}

export async function subirImagenDirecta(file, prefijo, endpointUploadUrl) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  if (!file.type || file.type.indexOf('image/') !== 0) {
    throw new Error(`"${file.name}" no es una imagen válida.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" pesa más de 5 MB.`);
  }

  const resToken = await fetch(endpointUploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefijo, extension: extensionDeArchivo(file) }),
  });
  const infoToken = await resToken.json().catch(() => ({}));
  if (!resToken.ok || !infoToken.ok) {
    throw new Error(infoToken.mensaje || 'No se pudo iniciar la subida de la imagen.');
  }

  const { error: errorSubida } = await supabaseBrowser
    .storage
    .from(BUCKET)
    .uploadToSignedUrl(infoToken.path, infoToken.token, file, { contentType: file.type });

  if (errorSubida) {
    throw new Error(`No se pudo subir "${file.name}": ${errorSubida.message}`);
  }

  const { data } = supabaseBrowser.storage.from(BUCKET).getPublicUrl(infoToken.path);
  return data.publicUrl;
}
