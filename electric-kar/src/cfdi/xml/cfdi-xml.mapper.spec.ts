import {
  CfdiData,
  formatFechaCfdi,
  mapCfdiToXmlInput,
  splitSerieFolio,
} from './cfdi-xml.mapper';

const emisor = { rfc: 'EKA210345XY8', nombre: 'Electric Kar', regimenFiscal: '601', lugarExpedicion: '03100' };
const csd = { noCertificado: '30001000000500000001', certificadoB64: 'CERT==' };

function cfdiData(): CfdiData {
  return {
    serieFolio: 'A-18451',
    fecha: new Date(2026, 5, 22, 9, 5, 3), // local
    formaPago: '04',
    metodoPago: 'PUE',
    moneda: 'MXN',
    subtotal: '350.00',
    total: '398.00',
    iva: '48.00',
    tipoComprobante: 'I',
    receptorNombre: 'Juan Pérez',
    receptorRfc: 'PEGJ850912H4A',
    receptorCp: '06000',
    receptorRegimen: '612',
    usoCfdi: 'G03',
    lineas: [
      {
        claveProdSat: '01010101', noIdentificacion: 'SKU-1', claveUnidadSat: 'H87',
        descripcion: 'Batería', cantidad: 2, precioUnitario: '150.00', importe: '300.00',
        base: '300.00', impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: '0.160000',
        importeImpuesto: '48.00', objetoImp: '02',
      },
      {
        claveProdSat: '01010101', noIdentificacion: 'SKU-2', claveUnidadSat: 'H87',
        descripcion: 'Manual', cantidad: 1, precioUnitario: '50.00', importe: '50.00',
        base: '50.00', impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: '0.000000',
        importeImpuesto: '0.00', objetoImp: '02',
      },
    ],
  };
}

describe('splitSerieFolio', () => {
  it('separa serie y folio', () => {
    expect(splitSerieFolio('A-18451')).toEqual({ serie: 'A', folio: '18451' });
  });
  it('sin guión, todo es folio', () => {
    expect(splitSerieFolio('18451')).toEqual({ folio: '18451' });
  });
  it('vacío devuelve objeto vacío', () => {
    expect(splitSerieFolio(null)).toEqual({});
  });
});

describe('formatFechaCfdi', () => {
  it('formatea sin zona horaria y con ceros', () => {
    expect(formatFechaCfdi(new Date(2026, 5, 22, 9, 5, 3))).toBe('2026-06-22T09:05:03');
  });
});

describe('mapCfdiToXmlInput', () => {
  it('mapea conceptos, receptor y totales', () => {
    const input = mapCfdiToXmlInput(cfdiData(), emisor, csd);
    expect(input.serie).toBe('A');
    expect(input.folio).toBe('18451');
    expect(input.conceptos).toHaveLength(2);
    expect(input.receptor.rfc).toBe('PEGJ850912H4A');
    expect(input.totalImpuestosTrasladados).toBe('48.00');
    expect(input.noCertificado).toBe('30001000000500000001');
  });

  it('agrupa traslados por tasa (16% y 0%)', () => {
    const input = mapCfdiToXmlInput(cfdiData(), emisor, csd);
    expect(input.traslados).toHaveLength(2);
    const t16 = input.traslados.find((t) => t.tasaOCuota === '0.160000')!;
    expect(t16.base).toBe('300.00');
    expect(t16.importe).toBe('48.00');
    const t0 = input.traslados.find((t) => t.tasaOCuota === '0.000000')!;
    expect(t0.importe).toBe('0.00');
  });
});
