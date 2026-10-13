import resend from './resend';
import { esc, colorSeguro } from './escapeHtml';

function formatearMoneda(n) {
  try { return Number(n).toLocaleString('es-AR'); } catch (e) { return String(n); }
}

function filasItems(resultado, vendorId) {
  return resultado.itemsDetallados
    .filter((it) => it.grupoId === vendorId)
    .map((it) => {
      const det = esc(it.nombre) + (it.talle ? ' · Talle ' + esc(it.talle) : '') + (it.color ? ' · ' + esc(it.color) : '');
      return `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${det}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${esc(it.cantidad)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">$${formatearMoneda(it.subtotal)}</td></tr>`;
    }).join('');
}

function htmlEmailComprador(payload, resultado, idPedido, config) {
  const color = colorSeguro(config.ColorPrimario, '#073763');
  const bloques = resultado.grupos.map((g) => {
    const filas = filasItems(resultado, g.vendorId);
    const avisoWA = g.vendorId !== 'CLUB' && g.telefono
      ? `<p style="margin:6px 0 0;">📲 Enviá también el comprobante por WhatsApp a <strong>${esc(g.nombre)}</strong>: ${esc(g.telefono)}</p>`
      : '';
    return `<div style="background:#f1f5f9;border-radius:8px;padding:14px;margin:14px 0;">` +
      `<p style="margin:0 0 6px;font-weight:bold;">${g.vendorId === 'CLUB' ? 'Tienda Oficial' : 'Producto de socio: ' + esc(g.nombre)}</p>` +
      `<table style="width:100%;border-collapse:collapse;"><tbody>${filas}</tbody></table>` +
      `<p style="text-align:right;margin:8px 0 0;font-weight:bold;">Subtotal: $${formatearMoneda(g.monto)}</p>` +
      `<p style="margin:4px 0 0;color:#475569;font-size:13px;">Alias: ${esc(g.alias || '-')}</p>` +
      (g.comprobanteRecibido
        ? `<p style="color:#1e6b3a;margin:6px 0 0;">✅ Comprobante recibido</p>`
        : `<p style="color:#8a5300;margin:6px 0 0;">⚠️ No recibimos comprobante para este pago</p>`) +
      avisoWA + `</div>`;
  }).join('');

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a202c;">` +
    `<div style="background:${color};padding:24px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:20px;">${esc(config.NombreTienda || 'Tienda Oficial')}</h1></div>` +
    `<div style="padding:24px;"><p>Hola ${esc(payload.nombre)},</p>` +
    `<p>¡Gracias por tu compra! Resumen del pedido <strong>#${esc(idPedido)}</strong>:</p>` +
    bloques +
    `<p style="text-align:right;font-size:18px;font-weight:bold;">Total: $${formatearMoneda(resultado.total)}</p>` +
    `<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">` +
    `<p style="margin:0 0 8px;"><strong>Datos de envío</strong></p>` +
    `<p style="margin:0;">${esc(payload.nombre)} · DNI ${esc(payload.dni)}<br>${esc(payload.telefono)}<br>${esc(payload.direccion)}</p></div>` +
    `<p>${esc(config.MensajeConfirmacion || 'La tienda se va a comunicar con vos para coordinar la entrega. ¡Gracias por tu compra!')}</p>` +
    `<p style="color:#64748b;font-size:13px;">Tienda Demo · Proyecto de portafolio</p></div></div>`;
}

function htmlEmailAdmin(payload, resultado, idPedido) {
  const filas = resultado.itemsDetallados.map((it) => {
    const det = esc(it.nombre) + (it.talle ? ' · Talle ' + esc(it.talle) : '') + (it.color ? ' · ' + esc(it.color) : '') + (it.grupoId !== 'CLUB' ? ' (socio)' : '');
    return `<tr><td style="padding:6px;border-bottom:1px solid #ddd;">${det}</td><td style="padding:6px;text-align:center;">${esc(it.cantidad)}</td><td style="padding:6px;text-align:right;">$${formatearMoneda(it.subtotal)}</td></tr>`;
  }).join('');
  const comprobantes = resultado.grupos.map((g) => {
    return g.comprobanteUrl
      ? `<p>📎 Comprobante (${g.vendorId === 'CLUB' ? 'Tienda Oficial' : esc(g.nombre)}): guardado como "${esc(g.comprobanteUrl)}" — vélo desde el panel Admin.</p>`
      : `<p>⚠️ Sin comprobante de "${g.vendorId === 'CLUB' ? 'Tienda Oficial' : esc(g.nombre)}"</p>`;
  }).join('');
  return `<div style="font-family:Arial;max-width:560px;"><h2>🛒 Nueva compra #${esc(idPedido)}</h2>` +
    `<p><strong>Comprador:</strong> ${esc(payload.nombre)} (DNI ${esc(payload.dni)})<br>` +
    `<strong>Tel:</strong> ${esc(payload.telefono)}<br><strong>Dir:</strong> ${esc(payload.direccion)}<br><strong>Email:</strong> ${esc(payload.email)}</p>` +
    `<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f1f5f9;"><th style="padding:6px;text-align:left;">Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead>` +
    `<tbody>${filas}</tbody></table>` +
    `<p><strong>Total: $${formatearMoneda(resultado.total)}</strong></p>${comprobantes}</div>`;
}

function htmlEmailSocio(payload, resultado, idPedido, grupo) {
  const filas = filasItems(resultado, grupo.vendorId);
  return `<div style="font-family:Arial;max-width:560px;"><h2>🛒 ¡Vendiste! Pedido #${esc(idPedido)}</h2>` +
    `<table style="width:100%;border-collapse:collapse;"><tbody>${filas}</tbody></table>` +
    `<p><strong>Total a cobrar: $${formatearMoneda(grupo.monto)}</strong></p>` +
    (grupo.comprobanteUrl
      ? `<p>📎 Recibimos un comprobante de esta compra. Podés verlo desde tu portal de socio.</p>`
      : `<p>⚠️ No recibimos comprobante. Puede que el comprador lo envíe por WhatsApp.</p>`) +
    `<p><strong>Datos del comprador:</strong><br>${esc(payload.nombre)} · DNI ${esc(payload.dni)}<br>${esc(payload.telefono)}<br>${esc(payload.direccion)}<br>${esc(payload.email)}</p></div>`;
}

export function htmlEmailActualizacion(nombre, idPedido, estado, config) {
  const color = colorSeguro(config && config.ColorPrimario, '#073763');
  const tienda = esc((config && config.NombreTienda) || 'Tienda Demo');
  const iconos = {
    'Entregado': '📦', 'En camino': '🚚', 'Listo para retirar': '✅',
    'Comprobante recibido': '💳', 'Cancelado': '❌', 'Pendiente': '⏳',
  };
  const icono = iconos[estado] || '🔔';
  const estadoSeguro = esc(estado);
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a202c;">` +
    `<div style="background:${color};padding:20px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:18px;">${tienda}</h1></div>` +
    `<div style="padding:24px;">` +
    `<p>Hola <strong>${esc(nombre)}</strong>,</p>` +
    `<p>Hay una actualización en tu pedido <strong>#${esc(idPedido)}</strong>:</p>` +
    `<div style="background:#f1f5f9;border-radius:10px;padding:18px;text-align:center;margin:16px 0;">` +
    `<p style="font-size:32px;margin:0 0 6px;">${icono}</p>` +
    `<p style="font-size:18px;font-weight:bold;margin:0;color:${color};">${estadoSeguro}</p>` +
    `</div>` +
    `<p style="color:#64748b;font-size:13px;">Tienda Demo · Proyecto de portafolio</p>` +
    `</div></div>`;
}

async function enviarSeguro({ from, to, subject, html }) {
  try {
    await resend.emails.send({ from, to, subject, html });
  } catch (e) {
    console.error('Error enviando email a', to, ':', e.message);
  }
}

export async function enviarEmailsPedido(payload, resultado, idPedido, config) {
  const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';

  await enviarSeguro({
    from, to: payload.email,
    subject: `Resumen de tu compra #${idPedido} - ${config.NombreTienda || 'Tienda Demo'}`,
    html: htmlEmailComprador(payload, resultado, idPedido, config),
  });

  if (config.EmailAdmin) {
    await enviarSeguro({
      from, to: config.EmailAdmin,
      subject: `🛒 Nueva compra #${idPedido}`,
      html: htmlEmailAdmin(payload, resultado, idPedido),
    });
  }

  for (const g of resultado.grupos) {
    if (g.vendorId === 'CLUB' || !g.email) continue;
    await enviarSeguro({
      from, to: g.email,
      subject: `🛒 Vendiste un producto - Pedido #${idPedido}`,
      html: htmlEmailSocio(payload, resultado, idPedido, g),
    });
  }
}
