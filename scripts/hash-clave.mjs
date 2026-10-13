import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const clave = process.argv[2];

if (!clave || clave.length < 8) {
  console.error('Uso: node scripts/hash-clave.mjs "<clave de al menos 8 caracteres>"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const derivada = await scrypt(clave, salt, 64, { N: 16384, r: 8, p: 1 });
console.log(`scrypt$${salt}$${derivada.toString('hex')}`);
