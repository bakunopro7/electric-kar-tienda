import { decryptSecret, encryptSecret } from './aes-gcm';

const MASTER = 'clave-maestra-de-prueba-32-bytes-min';

describe('aes-gcm', () => {
  it('(a) round-trip: descifra lo que cifra', () => {
    const plain = 'contraseña-del-csd-ÁÉÍ-123';
    const enc = encryptSecret(plain, MASTER);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc, MASTER)).toBe(plain);
  });

  it('(b) cada cifrado usa un IV distinto (no determinista)', () => {
    const a = encryptSecret('mismo-texto', MASTER);
    const b = encryptSecret('mismo-texto', MASTER);
    expect(a).not.toBe(b);
  });

  it('(c) una clave maestra distinta NO puede descifrar', () => {
    const enc = encryptSecret('secreto', MASTER);
    expect(() => decryptSecret(enc, 'otra-clave-maestra-distinta')).toThrow();
  });

  it('(d) un paquete manipulado falla la autenticación', () => {
    const enc = encryptSecret('secreto', MASTER);
    const raw = Buffer.from(enc, 'base64');
    raw[raw.length - 1] ^= 0xff; // flip último byte del ciphertext
    expect(() => decryptSecret(raw.toString('base64'), MASTER)).toThrow();
  });

  it('(e) sin clave maestra lanza error', () => {
    expect(() => encryptSecret('x', '')).toThrow(/CSD_MASTER_KEY/);
  });
});
