import { create } from 'xmlbuilder2';
import { CfdiXmlInput, construirCfdiXml } from './cfdi-xml.builder';

function baseInput(): CfdiXmlInput {
  return {
    serie: 'A',
    folio: '123',
    fecha: '2026-06-22T12:00:00',
    formaPago: '04',
    metodoPago: 'PUE',
    moneda: 'MXN',
    subtotal: '300.00',
    total: '348.00',
    tipoComprobante: 'I',
    noCertificado: '30001000000500000001',
    certificadoB64: 'CERT==',
    emisor: { rfc: 'EKA210345XY8', nombre: 'Electric Kar', regimenFiscal: '601', lugarExpedicion: '03100' },
    receptor: { rfc: 'PEGJ850912H4A', nombre: 'Juan Pérez', cpFiscal: '06000', regimenFiscal: '612', usoCfdi: 'G03' },
    conceptos: [
      {
        claveProdSat: '01010101',
        noIdentificacion: 'SKU-1',
        cantidad: 2,
        claveUnidadSat: 'H87',
        descripcion: 'Batería',
        valorUnitario: '150.00',
        importe: '300.00',
        objetoImp: '02',
        impuesto: '002',
        tipoFactor: 'Tasa',
        tasaOCuota: '0.160000',
        importeImpuesto: '48.00',
      },
    ],
    traslados: [
      { base: '300.00', impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: '0.160000', importe: '48.00' },
    ],
    totalImpuestosTrasladados: '48.00',
  };
}

// Helpers para consultar el XML resultante.
function parse(xml: string) {
  return create(xml).end({ format: 'object' }) as Record<string, any>;
}

describe('construirCfdiXml', () => {
  it('(a) genera un Comprobante 4.0 con los atributos clave', () => {
    const comp = parse(construirCfdiXml(baseInput()))['cfdi:Comprobante'];
    expect(comp['@Version']).toBe('4.0');
    expect(comp['@TipoDeComprobante']).toBe('I');
    expect(comp['@Exportacion']).toBe('01');
    expect(comp['@MetodoPago']).toBe('PUE');
    expect(comp['@LugarExpedicion']).toBe('03100');
    expect(comp['@NoCertificado']).toBe('30001000000500000001');
    expect(comp['@Sello']).toBe(''); // se llena al sellar
  });

  it('(b) Emisor y Receptor con los campos obligatorios de 4.0', () => {
    const comp = parse(construirCfdiXml(baseInput()))['cfdi:Comprobante'];
    expect(comp['cfdi:Emisor']['@RegimenFiscal']).toBe('601');
    const rec = comp['cfdi:Receptor'];
    expect(rec['@DomicilioFiscalReceptor']).toBe('06000');
    expect(rec['@RegimenFiscalReceptor']).toBe('612');
    expect(rec['@UsoCFDI']).toBe('G03');
  });

  it('(c) cada concepto lleva su traslado de impuesto con ObjetoImp', () => {
    const comp = parse(construirCfdiXml(baseInput()))['cfdi:Comprobante'];
    const concepto = comp['cfdi:Conceptos']['cfdi:Concepto'];
    expect(concepto['@ObjetoImp']).toBe('02');
    expect(concepto['@NoIdentificacion']).toBe('SKU-1');
    const traslado = concepto['cfdi:Impuestos']['cfdi:Traslados']['cfdi:Traslado'];
    expect(traslado['@TasaOCuota']).toBe('0.160000');
    expect(traslado['@Importe']).toBe('48.00');
  });

  it('(d) el nodo Impuestos global cuadra con el total trasladado', () => {
    const comp = parse(construirCfdiXml(baseInput()))['cfdi:Comprobante'];
    const imp = comp['cfdi:Impuestos'];
    expect(imp['@TotalImpuestosTrasladados']).toBe('48.00');
    expect(imp['cfdi:Traslados']['cfdi:Traslado']['@Base']).toBe('300.00');
  });

  it('(e) omite Serie/Folio/Descuento cuando no aplican', () => {
    const input = baseInput();
    input.serie = null;
    input.folio = null;
    const comp = parse(construirCfdiXml(input))['cfdi:Comprobante'];
    expect(comp['@Serie']).toBeUndefined();
    expect(comp['@Folio']).toBeUndefined();
    expect(comp['@Descuento']).toBeUndefined();
  });

  it('(f) escapa caracteres especiales en la descripción', () => {
    const input = baseInput();
    input.conceptos[0].descripcion = 'Cable <AWG> & "conector"';
    const xml = construirCfdiXml(input);
    expect(xml).not.toContain('<AWG>');
    expect(xml).toContain('&lt;AWG&gt;');
  });
});
