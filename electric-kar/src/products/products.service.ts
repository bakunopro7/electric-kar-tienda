import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductIndexService,
  ProductSearchResult,
} from './search/product-index.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productIndex: ProductIndexService,
  ) {}

  async create(dto: CreateProductDto) {
    let producto: Prisma.ProductoGetPayload<object>;
    try {
      producto = await this.prisma.producto.create({ data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
    // `create` devuelve la fila pelada (sin marca/categoria); re-leemos con
    // relaciones para indexar marcaNombre/categoriaNombre correctos.
    await this.indexSafe(async () => {
      const conRelaciones = await this.findOne(producto.id);
      await this.productIndex.upsert(conRelaciones);
    });
    return producto;
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
    let producto: Prisma.ProductoGetPayload<object>;
    try {
      producto = await this.prisma.producto.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
    // `update` devuelve la fila pelada (sin marca/categoria); re-leemos con
    // relaciones para indexar marcaNombre/categoriaNombre correctos.
    await this.indexSafe(async () => {
      const conRelaciones = await this.findOne(producto.id);
      await this.productIndex.upsert(conRelaciones);
    });
    return producto;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.producto.delete({ where: { id } });
    // Best-effort: el borrado de Postgres se devuelve pase lo que pase con el índice.
    await this.indexSafe(() => this.productIndex.delete(id));
    return { deleted: true };
  }

  /**
   * Búsqueda pública. Usa Typesense cuando está sano; si no está disponible o
   * falla, cae al `contains` de Prisma (mismo envelope `{ data, meta, facets }`),
   * forzando SIEMPRE `estado = PUBLICADO` para no filtrar BORRADOR/PROGRAMADO.
   */
  async searchPublic(dto: SearchProductDto): Promise<ProductSearchResult> {
    try {
      return await this.productIndex.search(dto);
    } catch (error) {
      this.logger.warn(
        `Búsqueda Typesense falló; usando fallback de Prisma: ${error}`,
      );
      return this.searchFallback(dto);
    }
  }

  /**
   * Fallback degradado a Prisma `contains` (ILIKE). Fuerza `estado = PUBLICADO`,
   * aplica los filtros de categoría/marca del DTO y devuelve el mismo envelope
   * que `ProductIndexService.search`, con `facets` vacío (sin facet counts).
   */
  private async searchFallback(
    dto: SearchProductDto,
  ): Promise<ProductSearchResult> {
    const page = dto.page ?? 1;
    const limit = dto.perPage ?? 20;

    const where: Prisma.ProductoWhereInput = {
      estado: 'PUBLICADO',
      ...(dto.categoriaId ? { categoriaId: dto.categoriaId } : {}),
      ...(dto.marcaId ? { marcaId: dto.marcaId } : {}),
      ...(dto.etiquetas?.length ? { etiquetas: { hasSome: dto.etiquetas } } : {}),
      ...(dto.q
        ? {
            OR: [
              { nombre: { contains: dto.q, mode: 'insensitive' } },
              { sku: { contains: dto.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
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
      data: rows.map((row) => this.productIndex.flatten(row)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      facets: {},
    };
  }

  /**
   * Sincronización best-effort con el índice de búsqueda. Ejecuta la op fuera de
   * cualquier transacción; ante un fallo solo registra un warning y NUNCA relanza
   * (una caída de Typesense no debe romper la escritura en Postgres).
   */
  private async indexSafe(op: () => Promise<unknown>): Promise<void> {
    try {
      await op();
    } catch (error) {
      this.logger.warn(`Sincronización con Typesense falló: ${error}`);
    }
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
