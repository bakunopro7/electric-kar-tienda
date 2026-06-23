/**
 * Mapea los datos de un CFDI de electric-kar al payload de creación de factura
 * de Facturapi (modelo full-service: Facturapi arma el XML, sella y timbra).
 *
 * Facturapi recalcula los impuestos a partir de los items, así que mandamos el
 * precio unitario (sin IVA) y la tasa por concepto.
 */
export interface FacturapiLineaInput {
  cantidad: number;
  descripcion: string;
  claveProdSat: string;
  claveUnidadSat: string;
  precioUnitario: string; // sin IVA
  tasaOCuota: string; // "0.160000"
}

export interface FacturapiCfdiInput {
  receptorNombre: string;
  receptorRfc: string;
  receptorRegimen: string;
  receptorCp: string;
  usoCfdi: string;
  formaPago: string;
  metodoPago: string;
  lineas: FacturapiLineaInput[];
}

export function mapToFacturapiInvoice(cfdi: FacturapiCfdiInput): Record<string, unknown> {
  return {
    customer: {
      legal_name: cfdi.receptorNombre,
      tax_id: cfdi.receptorRfc,
      tax_system: cfdi.receptorRegimen,
      address: { zip: cfdi.receptorCp },
    },
    items: cfdi.lineas.map((l) => ({
      quantity: l.cantidad,
      product: {
        description: l.descripcion,
        product_key: l.claveProdSat,
        unit_key: l.claveUnidadSat,
        price: Number(l.precioUnitario),
        tax_included: false,
        taxes: [{ type: 'IVA', factor: 'Tasa', rate: Number(l.tasaOCuota) }],
      },
    })),
    use: cfdi.usoCfdi,
    payment_form: cfdi.formaPago,
    payment_method: cfdi.metodoPago,
  };
}
