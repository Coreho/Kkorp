import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(24).toString('hex');
  return `${salt}:${(await derive(password, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 1024) return false;
  const [salt, hash] = String(encoded || '').split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  return timingSafeEqual(await derive(password, salt, 64), Buffer.from(hash, 'hex'));
}
