import { Prisma } from '../generated/prisma/client';

/**
 * Cálculo de impuestos CFDI 4.0 POR LÍNEA. Todo en Decimal (nunca float) para
 * evitar errores de redondeo y de cuadre del SAT (CFDI40110/CFDI40111).
 *
 * Regla de cuadre: el total de IVA del comprobante es la SUMA de los importes
 * de impuesto de cada línea (cada uno redondeado a 2 decimales), no un cálculo
 * global aparte. Así la suma de traslados por línea cuadra con el total.
 */
const D = Prisma.Decimal;

export interface LineaInput {
  importe: Prisma.Decimal; // base gravable de la línea (precio sin IVA)
  tasaIva: number; // 16 / 8 / 0
}

export interface LineaImpuesto {
  base: Prisma.Decimal;
  impuesto: string; // c_Impuesto (002 = IVA)
  tipoFactor: string; // Tasa
  tasaOCuota: string; // 6 decimales, p.ej. "0.160000"
  importeImpuesto: Prisma.Decimal; // redondeado a 2 decimales
  objetoImp: string; // 02 = sí objeto de impuesto
}

/** Importe de IVA de una línea, redondeado a 2 decimales. */
function ivaDeLinea(importe: Prisma.Decimal, tasaIva: number): Prisma.Decimal {
  return new D(importe).mul(tasaIva).div(100).toDecimalPlaces(2);
}

/** Calcula el bloque de impuestos de una sola línea. */
export function calcLineaImpuesto(importe: Prisma.Decimal, tasaIva: number): LineaImpuesto {
  return {
    base: new D(importe).toDecimalPlaces(2),
    impuesto: '002',
    tipoFactor: 'Tasa',
    tasaOCuota: new D(tasaIva).div(100).toFixed(6),
    importeImpuesto: ivaDeLinea(importe, tasaIva),
    objetoImp: '02',
  };
}

/** Totales del comprobante a partir de las líneas (subtotal, iva, total). */
export function calcTotales(lineas: LineaInput[]): {
  subtotal: Prisma.Decimal;
  iva: Prisma.Decimal;
  total: Prisma.Decimal;
} {
  let subtotal = new D(0);
  let iva = new D(0);
  for (const l of lineas) {
    subtotal = subtotal.add(l.importe);
    iva = iva.add(ivaDeLinea(l.importe, l.tasaIva));
  }
  subtotal = subtotal.toDecimalPlaces(2);
  iva = iva.toDecimalPlaces(2);
  return { subtotal, iva, total: subtotal.add(iva).toDecimalPlaces(2) };
}

/** Agrupa los traslados por tasa (para el nodo Impuestos del XML). */
export function agruparTraslados(
  lineas: LineaInput[],
): { tasaOCuota: string; base: string; importe: string }[] {
  const porTasa = new Map<number, { base: Prisma.Decimal; importe: Prisma.Decimal }>();
  for (const l of lineas) {
    const actual = porTasa.get(l.tasaIva) ?? { base: new D(0), importe: new D(0) };
    actual.base = actual.base.add(l.importe);
    actual.importe = actual.importe.add(ivaDeLinea(l.importe, l.tasaIva));
    porTasa.set(l.tasaIva, actual);
  }
  return [...porTasa.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([tasa, v]) => ({
      tasaOCuota: new D(tasa).div(100).toFixed(6),
      base: v.base.toFixed(2),
      importe: v.importe.toFixed(2),
    }));
}
