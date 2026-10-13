import resend from './resend';
import { esc } from './escapeHtml';

async function enviarSeguro({ from, to, subject, html }) {
  try {
    await resend.emails.send({ from, to, subject, html });
  } catch (e) {
    console.error('Error enviando email a', to, ':', e.message);
  }
}

function nombreSocio(socio, dni) {
  return socio ? `${socio.nombre} ${socio.apellido}` : dni;
}

export async function notificarAdminNuevoProducto(config, socio, nombreProducto) {
  if (!config.EmailAdmin) return;
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
  await enviarSeguro({
    from, to: config.EmailAdmin,
    subject: `Nuevo producto de socio para aprobar: ${nombreProducto}`,
    html: `El socio <strong>${esc(nombreSocio(socio, socio?.dni))}</strong> (DNI ${esc(socio?.dni || '')}) cargó ` +
      `"<strong>${esc(nombreProducto)}</strong>" para revisión.<br><br>` +
      `Para publicarlo: tabla <strong>productos_socios</strong> → columna <strong>aprobado</strong> → <strong>true</strong>.`,
  });
}

export async function notificarAdminProductoEditado(config, socio, nombreProducto) {
  if (!config.EmailAdmin) return;
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
  await enviarSeguro({
    from, to: config.EmailAdmin,
    subject: `Producto editado, pendiente de re-aprobación: ${nombreProducto}`,
    html: `El socio <strong>${esc(nombreSocio(socio, socio?.dni))}</strong> (DNI ${esc(socio?.dni || '')}) editó ` +
      `"<strong>${esc(nombreProducto)}</strong>", que ya estaba publicado, así que quedó pendiente de re-aprobación.<br><br>` +
      `Para volver a publicarlo: tabla <strong>productos_socios</strong> → columna <strong>aprobado</strong> → <strong>true</strong>.`,
  });
}

export async function notificarAdminNuevoServicio(config, socio, rubro) {
  if (!config.EmailAdmin) return;
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
  await enviarSeguro({
    from, to: config.EmailAdmin,
    subject: `Nuevo servicio de socio para aprobar: ${rubro}`,
    html: `El socio <strong>${esc(nombreSocio(socio, socio?.dni))}</strong> (DNI ${esc(socio?.dni || '')}) cargó el servicio ` +
      `"<strong>${esc(rubro)}</strong>" para revisión.<br><br>` +
      `Para publicarlo: tabla <strong>servicios_socios</strong> → columna <strong>aprobado</strong> → <strong>true</strong>.`,
  });
}

export async function notificarAdminServicioEditado(config, socio, rubro) {
  if (!config.EmailAdmin) return;
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
  await enviarSeguro({
    from, to: config.EmailAdmin,
    subject: `Servicio editado, pendiente de re-aprobación: ${rubro}`,
    html: `El socio <strong>${esc(nombreSocio(socio, socio?.dni))}</strong> (DNI ${esc(socio?.dni || '')}) editó el servicio ` +
      `"<strong>${esc(rubro)}</strong>", que ya estaba publicado, así que quedó pendiente de re-aprobación.<br><br>` +
      `Para volver a publicarlo: tabla <strong>servicios_socios</strong> → columna <strong>aprobado</strong> → <strong>true</strong>.`,
  });
}
