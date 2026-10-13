import crypto from 'crypto';

function obtenerSecreto() {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error('JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres).');
  }
  return secreto;
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function firmar(data) {
  return crypto.createHmac('sha256', obtenerSecreto()).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function firmasIguales(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function firmarSesion(payload, ttlSegundos) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + ttlSegundos;
  const body = { ...payload, exp };
  const h = base64url(JSON.stringify(header));
  const b = base64url(JSON.stringify(body));
  const sig = firmar(`${h}.${b}`);
  return `${h}.${b}.${sig}`;
}

export function verificarSesion(token) {
  if (!token || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [h, b, sig] = partes;

  let header;
  try { header = JSON.parse(base64urlDecode(h)); } catch (e) { return null; }
  if (!header || header.alg !== 'HS256') return null;

  if (!firmasIguales(firmar(`${h}.${b}`), sig)) return null;

  let body;
  try { body = JSON.parse(base64urlDecode(b)); } catch (e) { return null; }
  if (!body || !body.exp) return null;
  if (Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}
