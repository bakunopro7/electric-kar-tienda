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

    const tasaIva = Number(this.config.get<string>('IVA_TASA', '16'));
    const subtotal = pedido.subtotal;
    const iva = subtotal.mul(tasaIva).div(100);
    const total = subtotal.add(iva);

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
          create: pedido.lineas.map((linea) => ({
            claveProdSat: linea.producto.claveProdSat ?? '01010101',
            claveUnidadSat: 'H87', // Pieza
            descripcion: linea.producto.nombre,
            cantidad: linea.cantidad,
            precioUnitario: linea.precioUnitario,
            importe: linea.importe,
          })),
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

  findAll() {
    return this.prisma.cfdi.findMany({
      orderBy: { fecha: 'desc' },
      include: cfdiInclude,
    });
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
