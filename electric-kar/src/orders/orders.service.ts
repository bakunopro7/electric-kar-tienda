import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoCupon,
  EstadoPedido,
  EstadoProducto,
  Prisma,
  TipoCupon,
} from '../generated/prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const pedidoInclude = {
  lineas: { include: { producto: true } },
  cliente: { select: { id: true, nombre: true, correo: true } },
} satisfies Prisma.PedidoInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convierte el carrito del cliente en un pedido: valida stock, calcula
   * totales (IVA incluido), aplica cupón si lo hay, genera folio, descuenta
   * inventario, vacía el carrito y actualiza al cliente. Todo en una transacción.
   *
   * El precio de los productos se considera **IVA incluido**: `subtotal` es la
   * suma de los importes y `iva` es la porción de impuesto contenida en ellos.
   */
  async checkout(clienteId: string, codigoCupon?: string) {
    return this.prisma.$transaction(async (tx) => {
      const carrito = await tx.carrito.findUnique({
        where: { clienteId },
        include: { items: { include: { producto: true } } },
      });

      if (!carrito || carrito.items.length === 0) {
        throw new BadRequestException('El carrito está vacío');
      }

      let subtotal = new Prisma.Decimal(0);
      let iva = new Prisma.Decimal(0);
      for (const item of carrito.items) {
        const p = item.producto;
        if (p.estado !== EstadoProducto.PUBLICADO) {
          throw new BadRequestException(`"${p.nombre}" ya no está disponible`);
        }
        if (
          p.seguirInventario &&
          !p.permitirSinStock &&
          p.existencias < item.cantidad
        ) {
          throw new BadRequestException(`Stock insuficiente para "${p.nombre}"`);
        }
        const importe = p.precio.mul(item.cantidad);
        subtotal = subtotal.add(importe);
        // IVA contenido en el precio: importe * tasa / (100 + tasa)
        iva = iva.add(importe.mul(p.tasaIva).div(100 + p.tasaIva));
      }
      iva = iva.toDecimalPlaces(2);

      // Cupón (opcional)
      let descuento = new Prisma.Decimal(0);
      let cuponId: string | undefined;
      if (codigoCupon) {
        const cupon = await this.aplicarCupon(tx, codigoCupon, subtotal);
        descuento = cupon.descuento;
        cuponId = cupon.id;
      }

      const total = Prisma.Decimal.max(subtotal.sub(descuento), 0).toDecimalPlaces(2);
      const folio = `EK-${204815 + (await tx.pedido.count())}`;

      const pedido = await tx.pedido.create({
        data: {
          clienteId,
          folio,
          subtotal,
          descuento,
          cuponId,
          iva,
          total,
          lineas: {
            create: carrito.items.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.producto.precio,
              importe: item.producto.precio.mul(item.cantidad),
            })),
          },
        },
        include: pedidoInclude,
      });

      // Decrement inventory for all tracked items in parallel over the same
      // transaction connection, instead of one sequential awaited UPDATE per
      // item (which held transaction locks open for the whole chain).
      await Promise.all(
        carrito.items
          .filter((item) => item.producto.seguirInventario)
          .map((item) =>
            tx.producto.update({
              where: { id: item.productoId },
              data: { existencias: { decrement: item.cantidad } },
            }),
          ),
      );

      if (cuponId) {
        await tx.cupon.update({
          where: { id: cuponId },
          data: { usos: { increment: 1 } },
        });
      }

      await tx.carritoItem.deleteMany({ where: { carritoId: carrito.id } });

      await tx.cliente.update({
        where: { id: clienteId },
        data: {
          pedidosCount: { increment: 1 },
          totalGastado: { increment: total },
        },
      });

      return pedido;
    });
  }

  /** Valida un cupón dentro de la transacción y devuelve el descuento. */
  private async aplicarCupon(
    tx: Prisma.TransactionClient,
    codigo: string,
    subtotal: Prisma.Decimal,
  ): Promise<{ id: string; descuento: Prisma.Decimal }> {
    const cupon = await tx.cupon.findUnique({ where: { codigo } });
    if (!cupon) {
      throw new BadRequestException('Cupón no encontrado');
    }
    const ahora = new Date();
    if (cupon.estado === EstadoCupon.EXPIRADO || ahora > cupon.fechaFin) {
      throw new BadRequestException('El cupón ha expirado');
    }
    if (ahora < cupon.fechaInicio) {
      throw new BadRequestException('El cupón aún no está vigente');
    }
    if (cupon.limiteTotal !== null && cupon.usos >= cupon.limiteTotal) {
      throw new BadRequestException('El cupón alcanzó su límite de usos');
    }
    if (subtotal.lessThan(cupon.compraMinima)) {
      throw new BadRequestException('No alcanzas la compra mínima del cupón');
    }

    let descuento = new Prisma.Decimal(0);
    if (cupon.tipo === TipoCupon.PORCENTAJE) {
      descuento = subtotal.mul(cupon.valor).div(100);
    } else if (cupon.tipo === TipoCupon.MONTO_FIJO) {
      descuento = Prisma.Decimal.min(cupon.valor, subtotal);
    }
    // ENVIO_GRATIS no descuenta del subtotal (no hay costo de envío aún).
    return { id: cupon.id, descuento: descuento.toDecimalPlaces(2) };
  }

  findAllForCliente(clienteId: string) {
    return this.prisma.pedido.findMany({
      where: { clienteId },
      orderBy: { creadoEn: 'desc' },
      include: pedidoInclude,
    });
  }

  async findAll(page = 1, limit = 20, estado?: EstadoPedido) {
    const take = Math.min(limit, 100);
    const where: Prisma.PedidoWhereInput = estado ? { estado } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: { creadoEn: 'desc' },
        include: pedidoInclude,
      }),
      this.prisma.pedido.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit: take, pages: Math.ceil(total / take) || 1 },
    };
  }

  async stats() {
    const [agg, pedidosCount] = await this.prisma.$transaction([
      this.prisma.pedido.aggregate({ _sum: { total: true } }),
      this.prisma.pedido.count(),
    ]);
    const ventas = agg._sum.total ?? new Prisma.Decimal(0);
    const ticket =
      pedidosCount > 0
        ? ventas.div(pedidosCount)
        : new Prisma.Decimal(0);
    return {
      ventasTotal: ventas.toFixed(2),
      pedidosCount,
      ticketPromedio: ticket.toFixed(2),
    };
  }

  async findOne(pedidoId: string, requester: AuthUser) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: pedidoInclude,
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (requester.tipo === 'cliente' && pedido.clienteId !== requester.id) {
      throw new ForbiddenException('No tienes acceso a este pedido');
    }
    return pedido;
  }

  async updateStatus(pedidoId: string, dto: UpdateOrderStatusDto) {
    await this.ensureExists(pedidoId);
    return this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: dto.estado },
      include: pedidoInclude,
    });
  }

  private async ensureExists(pedidoId: string) {
    const exists = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Pedido no encontrado');
    }
  }
}
