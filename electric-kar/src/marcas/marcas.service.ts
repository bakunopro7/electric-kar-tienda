import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';

@Injectable()
export class MarcasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMarcaDto) {
    try {
      return await this.prisma.marca.create({ data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  findAll() {
    return this.prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const marca = await this.prisma.marca.findUnique({ where: { id } });
    if (!marca) {
      throw new NotFoundException('Marca no encontrada');
    }
    return marca;
  }

  async update(id: string, dto: UpdateMarcaDto) {
    await this.findOne(id);
    try {
      return await this.prisma.marca.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.marca.delete({ where: { id } });
    return { deleted: true };
  }

  private handleKnownErrors(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Ya existe una marca con ese nombre o slug');
    }
    return error as Error;
  }
}
