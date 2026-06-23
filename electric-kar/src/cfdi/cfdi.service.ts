import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoCfdi, MetodoPagoSat, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CancelarCfdiDto } from './dto/cancelar-cfdi.dto';
import { ComplementoPagoDto } from './dto/complemento-pago.dto';
import { EmitirCfdiDto } from './dto/emitir-cfdi.dto';
import { calcLineaImpuesto, calcTotales } from './impuestos';
import { FacturapiProvider } from './facturapi/facturapi.provider';
import { mapToFacturapiInvoice } from './facturapi/cfdi-facturapi.mapper';

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
    private readonly facturapi: FacturapiProvider,
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
   * Timbra el CFDI vía Facturapi (PAC full-service): le manda los datos, el PAC
   * arma el XML, sella con el CSD y timbra. Guarda el folio fiscal (UUID) y el
   * id de Facturapi para cancelar/descargar después.
   */
  async timbrar(id: string) {
    const cfdi = await this.findOne(id);
    if (cfdi.estado !== EstadoCfdi.POR_TIMBRAR) {
      throw new BadRequestException('El CFDI no está pendiente de timbrar');
    }

    const payload = mapToFacturapiInvoice({
      receptorNombre: cfdi.receptorNombre,
      receptorRfc: cfdi.receptorRfc,
      receptorRegimen: cfdi.receptorRegimen,
      receptorCp: cfdi.receptorCp,
      usoCfdi: cfdi.usoCfdi,
      formaPago: cfdi.formaPago,
      metodoPago: cfdi.metodoPago,
      lineas: cfdi.lineas.map((l) => ({
        cantidad: l.cantidad,
        descripcion: l.descripcion,
        claveProdSat: l.claveProdSat,
        claveUnidadSat: l.claveUnidadSat,
        precioUnitario: l.precioUnitario.toString(),
        tasaOCuota: l.tasaOCuota,
      })),
    });

    const factura = await this.facturapi.timbrar(payload);
    const serieFolio =
      [factura.series, factura.folio_number].filter(Boolean).join('-') || cfdi.serieFolio;

    return this.prisma.cfdi.update({
      where: { id },
      data: {
        estado: EstadoCfdi.TIMBRADA,
        uuidFiscal: factura.uuid,
        facturapiId: factura.id,
        serieFolio,
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
