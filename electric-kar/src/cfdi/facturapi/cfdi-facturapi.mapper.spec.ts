import { FacturapiCfdiInput, mapToFacturapiInvoice } from './cfdi-facturapi.mapper';

function input(): FacturapiCfdiInput {
  return {
    receptorNombre: 'Juan Pérez',
    receptorRfc: 'PEGJ850912H4A',
    receptorRegimen: '612',
    receptorCp: '06000',
    usoCfdi: 'G03',
    formaPago: '04',
    metodoPago: 'PUE',
    lineas: [
      {
        cantidad: 2,
        descripcion: 'Batería',
        claveProdSat: '01010101',
        claveUnidadSat: 'H87',
        precioUnitario: '150.00',
        tasaOCuota: '0.160000',
      },
    ],
  };
}

describe('mapToFacturapiInvoice', () => {
  it('mapea el receptor a customer con RFC, régimen y CP', () => {
    const out = mapToFacturapiInvoice(input()) as any;
    expect(out.customer.legal_name).toBe('Juan Pérez');
    expect(out.customer.tax_id).toBe('PEGJ850912H4A');
    expect(out.customer.tax_system).toBe('612');
    expect(out.customer.address.zip).toBe('06000');
  });

  it('mapea las líneas a items con impuesto IVA como número', () => {
    const out = mapToFacturapiInvoice(input()) as any;
    expect(out.items).toHaveLength(1);
    const item = out.items[0];
    expect(item.quantity).toBe(2);
    expect(item.product.price).toBe(150);
    expect(item.product.tax_included).toBe(false);
    expect(item.product.taxes[0]).toEqual({ type: 'IVA', factor: 'Tasa', rate: 0.16 });
  });

  it('mapea uso, forma y método de pago', () => {
    const out = mapToFacturapiInvoice(input()) as any;
    expect(out.use).toBe('G03');
    expect(out.payment_form).toBe('04');
    expect(out.payment_method).toBe('PUE');
  });

  it('tasa 0 produce rate 0', () => {
    const dto = input();
    dto.lineas[0].tasaOCuota = '0.000000';
    const out = mapToFacturapiInvoice(dto) as any;
    expect(out.items[0].product.taxes[0].rate).toBe(0);
  });
});
