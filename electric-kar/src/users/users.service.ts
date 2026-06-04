import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Campos públicos del usuario (sin el hash de contraseña). */
const usuarioSelect = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  estado: true,
  ultimoAcceso: true,
  creadoEn: true,
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });
    if (existing) {
      throw new ConflictException('El correo ya está en uso');
    }
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.usuario.create({
      data: { ...dto, password },
      select: usuarioSelect,
    });
  }

  findAll() {
    return this.prisma.usuario.findMany({ select: usuarioSelect });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: usuarioSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.usuario.delete({ where: { id } });
    return { deleted: true };
  }
}
