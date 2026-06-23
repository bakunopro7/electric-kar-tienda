import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Facturapi from 'facturapi';

/**
 * Transport hacia Facturapi (PAC full-service). La API key se lee por entorno
 * según el modo; la key encodea por sí misma test/live (sk_test / sk_live).
 * El CSD vive en Facturapi, no en nuestra base.
 */
@Injectable()
export class FacturapiProvider {
  constructor(private readonly config: ConfigService) {}

  private cliente(): Facturapi {
    const modo = this.config.get<string>('FACTURAPI_MODE', 'test');
    const key =
      modo === 'live'
        ? this.config.get<string>('FACTURAPI_LIVE_KEY')
        : this.config.get<string>('FACTURAPI_TEST_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        `Falta la API key de Facturapi (FACTURAPI_${modo === 'live' ? 'LIVE' : 'TEST'}_KEY)`,
      );
    }
    return new Facturapi(key);
  }

  /** Crea y timbra una factura (en test devuelve un CFDI de prueba). */
  timbrar(payload: Record<string, unknown>) {
    return this.cliente().invoices.create(payload);
  }

  /** Cancela una factura por su id de Facturapi. */
  cancelar(facturapiId: string, motive: string, substitution?: string) {
    return this.cliente().invoices.cancel(facturapiId, {
      motive: motive as never,
      substitution,
    });
  }

  descargarPdf(facturapiId: string) {
    return this.cliente().invoices.downloadPdf(facturapiId);
  }

  descargarXml(facturapiId: string) {
    return this.cliente().invoices.downloadXml(facturapiId);
  }
}
