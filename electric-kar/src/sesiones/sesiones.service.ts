import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SesionesService {
  constructor(private readonly prisma: PrismaService) {}

  findActivas() {
    return this.prisma.sesion.findMany({
      where: { activa: true },
      orderBy: { creadoEn: 'desc' },
      include: { usuario: { select: { id: true, nombre: true, correo: true } } },
    });
  }

  async cerrar(id: string) {
    const sesion = await this.prisma.sesion.findUnique({ where: { id } });
    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada');
    }
    return this.prisma.sesion.update({
      where: { id },
      data: { activa: false },
    });
  }

  async cerrarTodas() {
    const { count } = await this.prisma.sesion.updateMany({
      where: { activa: true },
      data: { activa: false },
    });
    return { cerradas: count };
  }
}
