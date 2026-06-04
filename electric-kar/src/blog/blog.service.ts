import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Público --------------------------------------------------------------

  listarPublicados(categoria?: string) {
    return this.prisma.articulo.findMany({
      where: {
        publicado: true,
        ...(categoria && categoria !== 'Todos' ? { categoria } : {}),
      },
      orderBy: { publicadoEn: 'desc' },
    });
  }

  destacado() {
    return this.prisma.articulo.findFirst({
      where: { publicado: true, destacado: true },
      orderBy: { publicadoEn: 'desc' },
    });
  }

  async porSlug(slug: string) {
    const a = await this.prisma.articulo.findUnique({ where: { slug } });
    if (!a || !a.publicado) {
      throw new NotFoundException('Artículo no encontrado');
    }
    return a;
  }

  // --- Gestión (personal) ---------------------------------------------------

  listarTodos() {
    return this.prisma.articulo.findMany({ orderBy: { creadoEn: 'desc' } });
  }

  async crear(dto: CreateArticuloDto) {
    try {
      return await this.prisma.articulo.create({ data: dto });
    } catch (e) {
      throw this.handle(e);
    }
  }

  async actualizar(id: string, dto: UpdateArticuloDto) {
    await this.ensure(id);
    try {
      return await this.prisma.articulo.update({ where: { id }, data: dto });
    } catch (e) {
      throw this.handle(e);
    }
  }

  async eliminar(id: string) {
    await this.ensure(id);
    await this.prisma.articulo.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensure(id: string) {
    const a = await this.prisma.articulo.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Artículo no encontrado');
  }

  private handle(e: unknown): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException('Ya existe un artículo con ese slug');
    }
    return e as Error;
  }
}
