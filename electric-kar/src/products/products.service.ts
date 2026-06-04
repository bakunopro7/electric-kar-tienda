import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.producto.create({ data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  async findAll(query: QueryProductDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProductoWhereInput = {
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(query.marcaId ? { marcaId: query.marcaId } : {}),
      ...(query.search
        ? {
            OR: [
              { nombre: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: { categoria: true, marca: true },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true, marca: true },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    try {
      return await this.prisma.producto.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.producto.delete({ where: { id } });
    return { deleted: true };
  }

  private handleKnownErrors(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Ya existe un producto con ese SKU');
      }
      if (error.code === 'P2003') {
        return new BadRequestException('La categoría o marca indicada no existe');
      }
    }
    return error as Error;
  }
}
