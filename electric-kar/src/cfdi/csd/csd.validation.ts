import { BadRequestException } from '@nestjs/common';

/** Datos fiscales extraídos de un Certificado de Sello Digital. */
export interface CsdDatos {
  rfc: string;
  vigenciaDesde: Date;
  vigenciaHasta: Date;
}

/**
 * Valida que un CSD sea utilizable por el emisor: el RFC del certificado debe
 * coincidir con el del emisor y la fecha actual debe caer dentro de la vigencia.
 * Lanza BadRequestException con un mensaje claro si no.
 */
export function assertCsdUsable(csd: CsdDatos, emisorRfc: string, now: Date): void {
  if (csd.rfc.trim().toUpperCase() !== emisorRfc.trim().toUpperCase()) {
    throw new BadRequestException(
      `El RFC del certificado (${csd.rfc}) no coincide con el del emisor (${emisorRfc})`,
    );
  }
  if (now < csd.vigenciaDesde) {
    throw new BadRequestException('El certificado aún no es vigente');
  }
  if (now > csd.vigenciaHasta) {
    throw new BadRequestException('El certificado está vencido');
  }
}
