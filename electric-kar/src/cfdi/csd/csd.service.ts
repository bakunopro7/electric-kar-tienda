import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey, X509Certificate } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { encryptSecret } from '../../common/crypto/aes-gcm';
import { ModoIntegracion } from '../../generated/prisma/client';
import { assertCsdUsable, CsdDatos } from './csd.validation';
import { UploadCsdDto } from '../dto/upload-csd.dto';

/** Lo que se expone públicamente de un CSD (NUNCA la llave ni la contraseña). */
const csdPublicSelect = {
  id: true,
  rfc: true,
  noCertificado: true,
  vigenciaDesde: true,
  vigenciaHasta: true,
  modo: true,
  activo: true,
  creadoEn: true,
} as const;

interface CertParseResult extends CsdDatos {
  noCertificado: string;
  cerPem: string;
}

@Injectable()
export class CsdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Parsea un .cer (DER) y extrae RFC, número de certificado, vigencia y PEM. */
  private parseCer(cerDer: Buffer): CertParseResult {
    let cert: X509Certificate;
    try {
      cert = new X509Certificate(cerDer);
    } catch {
      throw new BadRequestException('El archivo .cer no es un certificado válido');
    }
    // El No. de certificado del SAT son los bytes del serial interpretados como ASCII.
    const noCertificado = Buffer.from(cert.serialNumber, 'hex').toString('ascii');
    return {
      rfc: extractRfc(cert.subject),
      noCertificado,
      vigenciaDesde: new Date(cert.validFrom),
      vigenciaHasta: new Date(cert.validTo),
      cerPem: cert.toString(),
    };
  }

  /** Verifica que la contraseña abra la llave privada (.key PKCS#8 DER cifrada). */
  private assertKeyPassword(keyDer: Buffer, password: string): void {
    try {
      createPrivateKey({ key: keyDer, format: 'der', type: 'pkcs8', passphrase: password });
    } catch {
      throw new BadRequestException('La contraseña del CSD es incorrecta o la llave es inválida');
    }
  }

  /**
   * Carga un CSD: valida que corresponda al emisor y esté vigente, verifica la
   * contraseña, cifra llave + contraseña en reposo y lo deja como activo
   * (desactivando el anterior del mismo modo).
   */
  async cargar(dto: UploadCsdDto) {
    const cerDer = Buffer.from(dto.cerBase64, 'base64');
    const keyDer = Buffer.from(dto.keyBase64, 'base64');

    const parsed = this.parseCer(cerDer);
    const emisorRfc = this.config.getOrThrow<string>('EMISOR_RFC');
    assertCsdUsable(parsed, emisorRfc, new Date());
    this.assertKeyPassword(keyDer, dto.password);

    const masterKey = this.config.getOrThrow<string>('CSD_MASTER_KEY');
    const keyEnc = encryptSecret(keyDer.toString('base64'), masterKey);
    const passEnc = encryptSecret(dto.password, masterKey);

    const [, creado] = await this.prisma.$transaction([
      this.prisma.certificadoSello.updateMany({
        where: { modo: dto.modo, activo: true },
        data: { activo: false },
      }),
      this.prisma.certificadoSello.create({
        data: {
          rfc: parsed.rfc,
          noCertificado: parsed.noCertificado,
          cerPem: parsed.cerPem,
          keyEnc,
          passEnc,
          vigenciaDesde: parsed.vigenciaDesde,
          vigenciaHasta: parsed.vigenciaHasta,
          modo: dto.modo,
          activo: true,
        },
        select: csdPublicSelect,
      }),
    ]);
    return creado;
  }

  /** Lista los CSD activos (sin exponer secretos). */
  estado(modo?: ModoIntegracion) {
    return this.prisma.certificadoSello.findMany({
      where: { activo: true, ...(modo ? { modo } : {}) },
      select: csdPublicSelect,
      orderBy: { creadoEn: 'desc' },
    });
  }
}

/** Extrae el RFC del subject del certificado (campo OID 2.5.4.45 del SAT). */
function extractRfc(subject: string): string {
  const rfcRe = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/;
  for (const line of subject.split('\n')) {
    const m = line.match(rfcRe);
    if (m) {
      return m[1];
    }
  }
  throw new BadRequestException('No se pudo extraer el RFC del certificado');
}
