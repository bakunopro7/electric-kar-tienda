import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoProducto, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const carritoInclude = {
  items: { include: { producto: true }, orderBy: { creadoEn: 'asc' } },
} satisfies Prisma.CarritoInclude;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Carrito del cliente (creándolo si no existe) con su total. */
  async getCart(clienteId: string) {
    const carrito = await this.prisma.carrito.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
      include: carritoInclude,
    });
    return this.withTotal(carrito);
  }

  async addItem(clienteId: string, dto: AddToCartDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto || producto.estado !== EstadoProducto.PUBLICADO) {
      throw new NotFoundException('Producto no disponible');
    }
    if (
      producto.seguirInventario &&
      !producto.permitirSinStock &&
      producto.existencias < dto.cantidad
    ) {
      throw new BadRequestException('Stock insuficiente');
    }

    const carrito = await this.prisma.carrito.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
    });

    await this.prisma.carritoItem.upsert({
      where: {
        carritoId_productoId: {
          carritoId: carrito.id,
          productoId: dto.productoId,
        },
      },
      create: {
        carritoId: carrito.id,
        productoId: dto.productoId,
        cantidad: dto.cantidad,
      },
      update: { cantidad: { increment: dto.cantidad } },
    });

    return this.getCart(clienteId);
  }

  async updateItem(clienteId: string, itemId: string, dto: UpdateCartItemDto) {
    await this.ensureItemBelongsToCliente(clienteId, itemId);
    await this.prisma.carritoItem.update({
      where: { id: itemId },
      data: { cantidad: dto.cantidad },
    });
    return this.getCart(clienteId);
  }

  async removeItem(clienteId: string, itemId: string) {
    await this.ensureItemBelongsToCliente(clienteId, itemId);
    await this.prisma.carritoItem.delete({ where: { id: itemId } });
    return this.getCart(clienteId);
  }

  async clear(clienteId: string) {
    const carrito = await this.prisma.carrito.findUnique({
      where: { clienteId },
    });
    if (carrito) {
      await this.prisma.carritoItem.deleteMany({
        where: { carritoId: carrito.id },
      });
    }
    return this.getCart(clienteId);
  }

  private async ensureItemBelongsToCliente(clienteId: string, itemId: string) {
    const item = await this.prisma.carritoItem.findUnique({
      where: { id: itemId },
      include: { carrito: true },
    });
    if (!item || item.carrito.clienteId !== clienteId) {
      throw new NotFoundException('Línea de carrito no encontrada');
    }
  }

  private withTotal<
    T extends {
      items: { cantidad: number; producto: { precio: Prisma.Decimal } }[];
    },
  >(carrito: T) {
    const total = carrito.items.reduce(
      (acc, item) => acc.add(item.producto.precio.mul(item.cantidad)),
      new Prisma.Decimal(0),
    );
    return { ...carrito, total };
  }
}
