import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { EstadoCfdi, MetodoPagoSat, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CancelarCfdiDto } from './dto/cancelar-cfdi.dto';
import { ComplementoPagoDto } from './dto/complemento-pago.dto';
import { EmitirCfdiDto } from './dto/emitir-cfdi.dto';
import { calcLineaImpuesto, calcTotales } from './impuestos';

const cfdiInclude = {
  lineas: true,
  complementos: true,
  pedido: { select: { id: true, folio: true, total: true } },
} satisfies Prisma.CfdiInclude;

@Injectable()
export class CfdiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Emite un CFDI a partir de un pedido. Genera los conceptos desde las
   * líneas del pedido y calcula el IVA. Queda en estado POR_TIMBRAR.
   */
  async emitir(dto: EmitirCfdiDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: { lineas: { include: { producto: true } } },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const existente = await this.prisma.cfdi.findUnique({
      where: { pedidoId: dto.pedidoId },
    });
    if (existente) {
      throw new ConflictException('El pedido ya tiene un CFDI');
    }

    // Impuestos POR LÍNEA (CFDI 4.0): el IVA se calcula con la tasa de cada
    // producto y los totales son la suma de las líneas (cuadre garantizado).
    const { subtotal, iva, total } = calcTotales(
      pedido.lineas.map((l) => ({ importe: l.importe, tasaIva: l.producto.tasaIva })),
    );

    return this.prisma.cfdi.create({
      data: {
        pedidoId: pedido.id,
        emisorRfc: this.config.getOrThrow<string>('EMISOR_RFC'),
        receptorNombre: dto.receptorNombre,
        receptorRfc: dto.receptorRfc,
        receptorCp: dto.receptorCp,
        receptorRegimen: dto.receptorRegimen,
        usoCfdi: dto.usoCfdi,
        formaPago: dto.formaPago,
        metodoPago: dto.metodoPago ?? MetodoPagoSat.PUE,
        tipoComprobante: dto.tipoComprobante ?? undefined,
        subtotal,
        iva,
        total,
        lineas: {
          create: pedido.lineas.map((linea) => {
            const imp = calcLineaImpuesto(linea.importe, linea.producto.tasaIva);
            return {
              claveProdSat: linea.producto.claveProdSat ?? '01010101',
              claveUnidadSat: 'H87', // Pieza
              noIdentificacion: linea.producto.sku,
              descripcion: linea.producto.nombre,
              cantidad: linea.cantidad,
              precioUnitario: linea.precioUnitario,
              importe: linea.importe,
              base: imp.base,
              impuesto: imp.impuesto,
              tipoFactor: imp.tipoFactor,
              tasaOCuota: imp.tasaOCuota,
              importeImpuesto: imp.importeImpuesto,
              objetoImp: imp.objetoImp,
            };
          }),
        },
      },
      include: cfdiInclude,
    });
  }

  /**
   * Simula el timbrado ante el PAC: asigna folio fiscal (UUID) y pasa a
   * TIMBRADA. El timbrado real requiere integrar un PAC autorizado.
   */
  async timbrar(id: string) {
    const cfdi = await this.findOne(id);
    if (cfdi.estado !== EstadoCfdi.POR_TIMBRAR) {
      throw new BadRequestException('El CFDI no está pendiente de timbrar');
    }
    await this.assertEmisorListo();
    return this.prisma.cfdi.update({
      where: { id },
      data: {
        estado: EstadoCfdi.TIMBRADA,
        uuidFiscal: randomUUID(),
        serieFolio: cfdi.serieFolio ?? `A-${Date.now()}`,
      },
      include: cfdiInclude,
    });
  }

  async cancelar(id: string, dto: CancelarCfdiDto) {
    const cfdi = await this.findOne(id);
    if (cfdi.estado !== EstadoCfdi.TIMBRADA) {
      throw new BadRequestException('Solo se pueden cancelar CFDI timbrados');
    }
    return this.prisma.cfdi.update({
      where: { id },
      data: {
        estado: EstadoCfdi.CANCELADA,
        motivoCancelacion: dto.motivoCancelacion,
        uuidSustituye: dto.uuidSustituye,
      },
      include: cfdiInclude,
    });
  }

  /** Registra un pago (Complemento de Pago / REP) para un CFDI PPD. */
  async registrarPago(id: string, dto: ComplementoPagoDto) {
    const cfdi = await this.findOne(id);
    if (cfdi.metodoPago !== MetodoPagoSat.PPD) {
      throw new BadRequestException(
        'El complemento de pago solo aplica a CFDI con método PPD',
      );
    }
    await this.prisma.complementoPago.create({
      data: {
        cfdiId: id,
        fechaPago: new Date(dto.fechaPago),
        formaPago: dto.formaPago,
        monto: dto.monto,
        moneda: dto.moneda ?? 'MXN',
        clabeOrdenante: dto.clabeOrdenante,
        bancoEmisor: dto.bancoEmisor,
        parcialidad: dto.parcialidad ?? 1,
        saldoAnterior: dto.saldoAnterior,
        saldoInsoluto: dto.saldoInsoluto,
      },
    });
    return this.findOne(id);
  }

  /** Exige datos de emisor y un CSD activo+vigente antes de timbrar. */
  private async assertEmisorListo() {
    const emisorRfc = this.config.get<string>('EMISOR_RFC');
    if (!emisorRfc) {
      throw new BadRequestException('Falta configurar el RFC del emisor (EMISOR_RFC)');
    }
    const csd = await this.prisma.certificadoSello.findFirst({
      where: { activo: true },
      orderBy: { creadoEn: 'desc' },
    });
    if (!csd) {
      throw new BadRequestException(
        'No hay un CSD activo; cargá el Certificado de Sello Digital antes de timbrar',
      );
    }
    if (csd.vigenciaHasta < new Date()) {
      throw new BadRequestException('El CSD activo está vencido');
    }
  }

  async findAll(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cfdi.findMany({
        skip: (page - 1) * take,
        take,
        orderBy: { fecha: 'desc' },
        include: cfdiInclude,
      }),
      this.prisma.cfdi.count(),
    ]);
    return {
      data,
      meta: { total, page, limit: take, pages: Math.ceil(total / take) || 1 },
    };
  }

  async findOne(id: string) {
    const cfdi = await this.prisma.cfdi.findUnique({
      where: { id },
      include: cfdiInclude,
    });
    if (!cfdi) {
      throw new NotFoundException('CFDI no encontrado');
    }
    return cfdi;
  }
}
