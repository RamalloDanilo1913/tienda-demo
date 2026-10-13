import resend from './resend';
import { esc } from './escapeHtml';

async function enviarSeguro({ from, to, subject, html }) {
  try { await resend.emails.send({ from, to, subject, html }); }
  catch (e) { console.error('Error enviando email a', to, ':', e.message); }
}

export async function notificarSocioProductoAprobado(config, socio, nombreProducto) {
  if (!socio || !socio.email) return;
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
  await enviarSeguro({
    from, to: socio.email,
    subject: `✅ Tu producto fue aprobado: ${String(nombreProducto).replace(/[\r\n]+/g, ' ')}`,
    html: `Hola <strong>${esc(socio.nombre)}</strong>,<br><br>` +
      `Tu producto <strong>${esc(nombreProducto)}</strong> fue aprobado y ya está publicado en la tienda.<br><br>` +
      `¡Gracias por participar!`,
  });
}

export async function notificarSocioServicioAprobado(config, socio, rubro) {
  if (!socio || !socio.email) return;
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
  await enviarSeguro({
    from, to: socio.email,
    subject: `✅ Tu servicio fue aprobado: ${String(rubro).replace(/[\r\n]+/g, ' ')}`,
    html: `Hola <strong>${esc(socio.nombre)}</strong>,<br><br>` +
      `Tu servicio <strong>${esc(rubro)}</strong> fue aprobado y ya está publicado en la tienda.<br><br>` +
      `¡Gracias por participar!`,
  });
}
