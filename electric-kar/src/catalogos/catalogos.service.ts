import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Catálogo genérico ----------------------------------------------------

  listar(tipo?: string) {
    return this.prisma.catalogo.findMany({
      where: tipo ? { tipo, activo: true } : undefined,
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }],
    });
  }

  async tipos() {
    const grupos = await this.prisma.catalogo.groupBy({ by: ['tipo'] });
    return grupos.map((g) => g.tipo).sort();
  }

  async crear(dto: CreateCatalogoDto) {
    try {
      return await this.prisma.catalogo.create({ data: dto });
    } catch (e) {
      throw this.handle(e);
    }
  }

  async actualizar(id: string, dto: UpdateCatalogoDto) {
    await this.ensure(id);
    return this.prisma.catalogo.update({ where: { id }, data: dto });
  }

  async eliminar(id: string) {
    await this.ensure(id);
    await this.prisma.catalogo.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Catálogos SAT --------------------------------------------------------

  listarSat(tipo?: string) {
    return this.prisma.catalogoSat.findMany({
      where: tipo ? { tipo, activo: true } : undefined,
      orderBy: [{ tipo: 'asc' }, { clave: 'asc' }],
    });
  }

  async tiposSat() {
    const grupos = await this.prisma.catalogoSat.groupBy({ by: ['tipo'] });
    return grupos.map((g) => g.tipo).sort();
  }

  // --- Helpers --------------------------------------------------------------

  private async ensure(id: string) {
    const item = await this.prisma.catalogo.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Entrada de catálogo no encontrada');
  }

  private handle(e: unknown): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException('Ya existe esa clave para ese tipo');
    }
    return e as Error;
  }
}
