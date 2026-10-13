import supabaseBrowser from './supabaseBrowser';

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'comprobantes';

function extensionDeArchivo(file) {
  if (file.type === 'application/pdf') return 'pdf';
  const porMime = (file.type || '').split('/')[1];
  if (porMime) return porMime === 'jpeg' ? 'jpg' : porMime;
  const porNombre = String(file.name || '').split('.').pop();
  return porNombre || 'jpg';
}

export async function subirComprobanteDirecto(file, vendorId, honeypot) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  const esImagen = file.type && file.type.indexOf('image/') === 0;
  const esPdf = file.type === 'application/pdf';
  if (!esImagen && !esPdf) {
    throw new Error(`"${file.name}" tiene que ser una imagen o un PDF.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" pesa más de 5 MB.`);
  }

  const resToken = await fetch('/api/pedidos/comprobante-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendorId, extension: extensionDeArchivo(file), tcf_hp: honeypot || '' }),
  });
  const infoToken = await resToken.json().catch(() => ({}));
  if (!resToken.ok || !infoToken.ok) {
    throw new Error(infoToken.mensaje || 'No se pudo iniciar la subida del comprobante.');
  }

  const { error: errorSubida } = await supabaseBrowser
    .storage
    .from(BUCKET)
    .uploadToSignedUrl(infoToken.path, infoToken.token, file, { contentType: file.type });

  if (errorSubida) {
    throw new Error(`No se pudo subir "${file.name}": ${errorSubida.message}`);
  }

  return infoToken.path;
}
