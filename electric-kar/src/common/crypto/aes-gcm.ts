import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * Cifrado simétrico autenticado AES-256-GCM para secretos en reposo
 * (clave privada del CSD y su contraseña). La clave maestra se deriva de
 * `CSD_MASTER_KEY` con scrypt; el IV es aleatorio por operación y el tag de
 * autenticación detecta manipulación.
 *
 * Formato de salida (base64): IV(12) || authTag(16) || ciphertext.
 */
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
// Sal de derivación a nivel app (no es secreta; el secreto es CSD_MASTER_KEY).
const SALT = 'electric-kar-csd-v1';

function deriveKey(masterKey: string): Buffer {
  if (!masterKey) {
    throw new Error('CSD_MASTER_KEY no está configurada');
  }
  return scryptSync(masterKey, SALT, KEY_LEN);
}

/** Cifra un texto plano y devuelve el paquete en base64. */
export function encryptSecret(plain: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Descifra un paquete base64 producido por {@link encryptSecret}. */
export function decryptSecret(payload: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const raw = Buffer.from(payload, 'base64');
  if (raw.length < IV_LEN + TAG_LEN) {
    throw new Error('Paquete cifrado inválido');
  }
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
