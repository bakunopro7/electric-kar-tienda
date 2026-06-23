import { create } from 'xmlbuilder2';

/**
 * Construye el XML de un CFDI 4.0 (sin sellar). Recibe los valores ya
 * formateados como string (2 decimales en importes, 6 en tasas) para no
 * depender de redondeos de float dentro del builder.
 *
 * El atributo Sello queda vacío: lo llena la fase de sellado tras calcular la
 * cadena original. NoCertificado y Certificado vienen del CSD activo.
 */
const NS_CFDI = 'http://www.sat.gob.mx/cfd/4';
const NS_XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const SCHEMA_LOCATION = `${NS_CFDI} http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd`;

export interface EmisorFiscal {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
  lugarExpedicion: string; // CP del emisor
}

export interface ReceptorFiscal {
  rfc: string;
  nombre: string;
  cpFiscal: string;
  regimenFiscal: string;
  usoCfdi: string;
}

export interface ConceptoXml {
  claveProdSat: string;
  noIdentificacion?: string | null;
  cantidad: number;
  claveUnidadSat: string;
  descripcion: string;
  valorUnitario: string;
  importe: string; // base gravable de la línea
  objetoImp: string;
  impuesto: string; // 002 = IVA
  tipoFactor: string; // Tasa
  tasaOCuota: string; // 6 decimales
  importeImpuesto: string;
}

export interface TrasladoXml {
  base: string;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: string;
  importe: string;
}

export interface CfdiXmlInput {
  serie?: string | null;
  folio?: string | null;
  fecha: string; // 'YYYY-MM-DDTHH:MM:SS' sin zona horaria
  formaPago: string;
  metodoPago: string;
  moneda: string;
  subtotal: string;
  descuento?: string | null;
  total: string;
  tipoComprobante: string;
  noCertificado: string;
  certificadoB64: string;
  emisor: EmisorFiscal;
  receptor: ReceptorFiscal;
  conceptos: ConceptoXml[];
  traslados: TrasladoXml[];
  totalImpuestosTrasladados: string;
}

export function construirCfdiXml(input: CfdiXmlInput): string {
  const comprobante: Record<string, string> = {
    'xmlns:cfdi': NS_CFDI,
    'xmlns:xsi': NS_XSI,
    'xsi:schemaLocation': SCHEMA_LOCATION,
    Version: '4.0',
    Fecha: input.fecha,
    Sello: '',
    FormaPago: input.formaPago,
    NoCertificado: input.noCertificado,
    Certificado: input.certificadoB64,
    SubTotal: input.subtotal,
    Moneda: input.moneda,
    Total: input.total,
    TipoDeComprobante: input.tipoComprobante,
    Exportacion: '01',
    MetodoPago: input.metodoPago,
    LugarExpedicion: input.emisor.lugarExpedicion,
  };
  if (input.serie) comprobante.Serie = input.serie;
  if (input.folio) comprobante.Folio = input.folio;
  if (input.descuento && Number(input.descuento) > 0) {
    comprobante.Descuento = input.descuento;
  }

  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('cfdi:Comprobante', comprobante);

  root.ele('cfdi:Emisor', {
    Rfc: input.emisor.rfc,
    Nombre: input.emisor.nombre,
    RegimenFiscal: input.emisor.regimenFiscal,
  });

  root.ele('cfdi:Receptor', {
    Rfc: input.receptor.rfc,
    Nombre: input.receptor.nombre,
    DomicilioFiscalReceptor: input.receptor.cpFiscal,
    RegimenFiscalReceptor: input.receptor.regimenFiscal,
    UsoCFDI: input.receptor.usoCfdi,
  });

  const conceptos = root.ele('cfdi:Conceptos');
  for (const c of input.conceptos) {
    const concepto = conceptos.ele('cfdi:Concepto', {
      ClaveProdServ: c.claveProdSat,
      ...(c.noIdentificacion ? { NoIdentificacion: c.noIdentificacion } : {}),
      Cantidad: String(c.cantidad),
      ClaveUnidad: c.claveUnidadSat,
      Descripcion: c.descripcion,
      ValorUnitario: c.valorUnitario,
      Importe: c.importe,
      ObjetoImp: c.objetoImp,
    });
    concepto
      .ele('cfdi:Impuestos')
      .ele('cfdi:Traslados')
      .ele('cfdi:Traslado', {
        Base: c.importe,
        Impuesto: c.impuesto,
        TipoFactor: c.tipoFactor,
        TasaOCuota: c.tasaOCuota,
        Importe: c.importeImpuesto,
      });
  }

  const impuestos = root.ele('cfdi:Impuestos', {
    TotalImpuestosTrasladados: input.totalImpuestosTrasladados,
  });
  const trasladosGlobal = impuestos.ele('cfdi:Traslados');
  for (const t of input.traslados) {
    trasladosGlobal.ele('cfdi:Traslado', {
      Base: t.base,
      Impuesto: t.impuesto,
      TipoFactor: t.tipoFactor,
      TasaOCuota: t.tasaOCuota,
      Importe: t.importe,
    });
  }

  return root.end({ prettyPrint: false });
}
