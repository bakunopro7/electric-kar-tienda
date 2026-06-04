import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.categoria.create({ data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  findAll() {
    return this.prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return categoria;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.categoria.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.categoria.delete({ where: { id } });
    return { deleted: true };
  }

  private handleKnownErrors(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'Ya existe una categoría con ese nombre o slug',
      );
    }
    return error as Error;
  }
}
