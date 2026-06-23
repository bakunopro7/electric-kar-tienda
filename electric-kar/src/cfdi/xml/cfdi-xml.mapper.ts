import { Prisma } from '../../generated/prisma/client';
import { CfdiXmlInput, ConceptoXml, TrasladoXml } from './cfdi-xml.builder';

/**
 * Mapea una Cfdi persistida (+ sus líneas) al input del builder de XML 4.0.
 * Trabaja con strings ya formateados para no acoplarse a Prisma en los tests.
 */
const D = Prisma.Decimal;

export interface CfdiLineaData {
  claveProdSat: string;
  noIdentificacion?: string | null;
  claveUnidadSat: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: string;
  importe: string;
  base: string;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: string;
  importeImpuesto: string;
  objetoImp: string;
}

export interface CfdiData {
  serieFolio?: string | null;
  fecha: Date;
  formaPago: string;
  metodoPago: string;
  moneda: string;
  subtotal: string;
  descuento?: string | null;
  total: string;
  iva: string;
  tipoComprobante: string;
  receptorNombre: string;
  receptorRfc: string;
  receptorCp: string;
  receptorRegimen: string;
  usoCfdi: string;
  lineas: CfdiLineaData[];
}

export interface EmisorConfig {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
  lugarExpedicion: string;
}

export interface CsdData {
  noCertificado: string;
  certificadoB64: string;
}

/** Fecha CFDI: 'YYYY-MM-DDTHH:MM:SS' sin zona horaria. */
export function formatFechaCfdi(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

/** Separa "A-18451" en Serie="A" y Folio="18451". */
export function splitSerieFolio(serieFolio?: string | null): { serie?: string; folio?: string } {
  if (!serieFolio) return {};
  const i = serieFolio.indexOf('-');
  if (i < 0) return { folio: serieFolio };
  return { serie: serieFolio.slice(0, i), folio: serieFolio.slice(i + 1) };
}

/** Agrupa traslados por tasa a partir de las líneas ya calculadas. */
function agruparTrasladosDeLineas(lineas: CfdiLineaData[]): TrasladoXml[] {
  const porTasa = new Map<string, { base: Prisma.Decimal; importe: Prisma.Decimal; impuesto: string; tipoFactor: string }>();
  for (const l of lineas) {
    const e = porTasa.get(l.tasaOCuota) ?? {
      base: new D(0),
      importe: new D(0),
      impuesto: l.impuesto,
      tipoFactor: l.tipoFactor,
    };
    e.base = e.base.add(l.base);
    e.importe = e.importe.add(l.importeImpuesto);
    porTasa.set(l.tasaOCuota, e);
  }
  return [...porTasa.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([tasaOCuota, e]) => ({
      base: e.base.toFixed(2),
      impuesto: e.impuesto,
      tipoFactor: e.tipoFactor,
      tasaOCuota,
      importe: e.importe.toFixed(2),
    }));
}

export function mapCfdiToXmlInput(cfdi: CfdiData, emisor: EmisorConfig, csd: CsdData): CfdiXmlInput {
  const { serie, folio } = splitSerieFolio(cfdi.serieFolio);
  const conceptos: ConceptoXml[] = cfdi.lineas.map((l) => ({
    claveProdSat: l.claveProdSat,
    noIdentificacion: l.noIdentificacion,
    cantidad: l.cantidad,
    claveUnidadSat: l.claveUnidadSat,
    descripcion: l.descripcion,
    valorUnitario: l.precioUnitario,
    importe: l.importe,
    objetoImp: l.objetoImp,
    impuesto: l.impuesto,
    tipoFactor: l.tipoFactor,
    tasaOCuota: l.tasaOCuota,
    importeImpuesto: l.importeImpuesto,
  }));

  return {
    serie,
    folio,
    fecha: formatFechaCfdi(cfdi.fecha),
    formaPago: cfdi.formaPago,
    metodoPago: cfdi.metodoPago,
    moneda: cfdi.moneda,
    subtotal: cfdi.subtotal,
    descuento: cfdi.descuento,
    total: cfdi.total,
    tipoComprobante: cfdi.tipoComprobante,
    noCertificado: csd.noCertificado,
    certificadoB64: csd.certificadoB64,
    emisor,
    receptor: {
      rfc: cfdi.receptorRfc,
      nombre: cfdi.receptorNombre,
      cpFiscal: cfdi.receptorCp,
      regimenFiscal: cfdi.receptorRegimen,
      usoCfdi: cfdi.usoCfdi,
    },
    conceptos,
    traslados: agruparTrasladosDeLineas(cfdi.lineas),
    totalImpuestosTrasladados: cfdi.iva,
  };
}
