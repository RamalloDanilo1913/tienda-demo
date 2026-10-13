const REEMPLAZOS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"']/g, (c) => REEMPLAZOS[c]);
}

export function colorSeguro(valor, porDefecto) {
  const v = String(valor || '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : porDefecto;
}
