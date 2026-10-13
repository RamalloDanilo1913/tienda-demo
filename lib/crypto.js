import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_LARGO = 64;
const PREFIJO_SCRYPT = 'scrypt$';

export function sha256Hex(texto) {
  return crypto.createHash('sha256').update(String(texto), 'utf8').digest('hex');
}

export function igualesSeguro(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function hashearClave(clave) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivada = await scryptAsync(String(clave), salt, SCRYPT_LARGO, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `${PREFIJO_SCRYPT}${salt}$${derivada.toString('hex')}`;
}

export function esHashScrypt(almacenado) {
  return typeof almacenado === 'string' && almacenado.trim().startsWith(PREFIJO_SCRYPT);
}

export async function verificarClaveScrypt(clave, almacenado) {
  const partes = String(almacenado || '').trim().split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const [, salt, hashHex] = partes;
  const derivada = await scryptAsync(String(clave), salt, SCRYPT_LARGO, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  const esperado = Buffer.from(hashHex, 'hex');
  if (esperado.length !== derivada.length) return false;
  return crypto.timingSafeEqual(derivada, esperado);
}

export async function verificarClaveSocio(clave, almacenado) {
  if (!almacenado) return { ok: false, necesitaActualizar: false };
  if (esHashScrypt(almacenado)) {
    return { ok: await verificarClaveScrypt(clave, almacenado), necesitaActualizar: false };
  }
  const ok = igualesSeguro(sha256Hex(clave), String(almacenado).trim());
  return { ok, necesitaActualizar: ok };
}

function obtenerSecretoIds() {
  const secreto = process.env.VENDOR_ID_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error('VENDOR_ID_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres).');
  }
  return secreto;
}

export function vendorPublicId(dni) {
  const limpio = String(dni).replace(/\D/g, '');
  const hmac = crypto.createHmac('sha256', obtenerSecretoIds()).update(limpio).digest('hex');
  return 'V' + hmac.substring(0, 16);
}

export function vendorPublicIdLegacy(dni) {
  return 'V' + sha256Hex(String(dni).replace(/\D/g, '')).substring(0, 10);
}

export function idsDeVendedor(dni) {
  return [vendorPublicId(dni), vendorPublicIdLegacy(dni)];
}
