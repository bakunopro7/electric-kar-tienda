import { assertCsdUsable, CsdDatos } from './csd.validation';

const EMISOR = 'EKA210345XY8';
const NOW = new Date('2026-06-22T12:00:00Z');

function csd(overrides: Partial<CsdDatos> = {}): CsdDatos {
  return {
    rfc: EMISOR,
    vigenciaDesde: new Date('2025-01-01T00:00:00Z'),
    vigenciaHasta: new Date('2027-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('assertCsdUsable', () => {
  it('(a) acepta un CSD vigente con RFC que coincide', () => {
    expect(() => assertCsdUsable(csd(), EMISOR, NOW)).not.toThrow();
  });

  it('(b) acepta aunque difiera en mayúsculas/espacios', () => {
    expect(() => assertCsdUsable(csd({ rfc: ` ${EMISOR.toLowerCase()} ` }), EMISOR, NOW)).not.toThrow();
  });

  it('(c) rechaza si el RFC del certificado no coincide con el emisor', () => {
    expect(() => assertCsdUsable(csd({ rfc: 'XAXX010101000' }), EMISOR, NOW)).toThrow(
      /no coincide con el del emisor/,
    );
  });

  it('(d) rechaza un certificado vencido', () => {
    const vencido = csd({ vigenciaHasta: new Date('2026-01-01T00:00:00Z') });
    expect(() => assertCsdUsable(vencido, EMISOR, NOW)).toThrow(/vencido/);
  });

  it('(e) rechaza un certificado que aún no es vigente', () => {
    const futuro = csd({ vigenciaDesde: new Date('2026-12-01T00:00:00Z') });
    expect(() => assertCsdUsable(futuro, EMISOR, NOW)).toThrow(/aún no es vigente/);
  });
});
