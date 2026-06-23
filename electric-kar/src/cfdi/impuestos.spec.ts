import { Prisma } from '../generated/prisma/client';
import { agruparTraslados, calcLineaImpuesto, calcTotales } from './impuestos';

const D = (n: string | number) => new Prisma.Decimal(n);

describe('calcLineaImpuesto', () => {
  it('(a) línea al 16%: tasa con 6 decimales e IVA a 2 decimales', () => {
    const r = calcLineaImpuesto(D('100.00'), 16);
    expect(r.tasaOCuota).toBe('0.160000');
    expect(r.importeImpuesto.toFixed(2)).toBe('16.00');
    expect(r.objetoImp).toBe('02');
    expect(r.impuesto).toBe('002');
  });

  it('(b) línea al 0%: traslado con tasa 0 e importe 0', () => {
    const r = calcLineaImpuesto(D('250.00'), 0);
    expect(r.tasaOCuota).toBe('0.000000');
    expect(r.importeImpuesto.toFixed(2)).toBe('0.00');
  });

  it('(c) redondea el IVA a 2 decimales (no float)', () => {
    // 33.33 * 16% = 5.3328 -> 5.33
    const r = calcLineaImpuesto(D('33.33'), 16);
    expect(r.importeImpuesto.toFixed(2)).toBe('5.33');
  });
});

describe('calcTotales', () => {
  it('(a) tasa uniforme 16%: subtotal + iva = total', () => {
    const t = calcTotales([
      { importe: D('100.00'), tasaIva: 16 },
      { importe: D('200.00'), tasaIva: 16 },
    ]);
    expect(t.subtotal.toFixed(2)).toBe('300.00');
    expect(t.iva.toFixed(2)).toBe('48.00');
    expect(t.total.toFixed(2)).toBe('348.00');
  });

  it('(b) tasas mixtas 16% y 0%: el IVA solo aplica a la base gravada', () => {
    const t = calcTotales([
      { importe: D('100.00'), tasaIva: 16 }, // 16.00
      { importe: D('50.00'), tasaIva: 0 }, // 0.00
    ]);
    expect(t.subtotal.toFixed(2)).toBe('150.00');
    expect(t.iva.toFixed(2)).toBe('16.00');
    expect(t.total.toFixed(2)).toBe('166.00');
  });

  it('(c) cuadre: el IVA total = suma de IVA por línea (redondeo por línea)', () => {
    const lineas = [
      { importe: D('33.33'), tasaIva: 16 }, // 5.33
      { importe: D('66.67'), tasaIva: 16 }, // 10.67
    ];
    const t = calcTotales(lineas);
    // 5.33 + 10.67 = 16.00 (cuadra con la suma por línea)
    expect(t.iva.toFixed(2)).toBe('16.00');
  });
});

describe('agruparTraslados', () => {
  it('agrupa por tasa y cuadra con el total de IVA', () => {
    const lineas = [
      { importe: D('100.00'), tasaIva: 16 },
      { importe: D('200.00'), tasaIva: 16 },
      { importe: D('50.00'), tasaIva: 0 },
    ];
    const grupos = agruparTraslados(lineas);
    expect(grupos).toHaveLength(2);
    const g16 = grupos.find((g) => g.tasaOCuota === '0.160000')!;
    expect(g16.base).toBe('300.00');
    expect(g16.importe).toBe('48.00');
    const sumaImportes = grupos.reduce((acc, g) => acc + Number(g.importe), 0);
    expect(sumaImportes.toFixed(2)).toBe(calcTotales(lineas).iva.toFixed(2));
  });
});
