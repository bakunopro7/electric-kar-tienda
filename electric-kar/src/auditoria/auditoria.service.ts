import { Injectable } from '@nestjs/common';
import { TipoActividad } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una entrada en la bitácora de actividad. Pensado para ser
   * llamado por otros módulos tras una acción de escritura.
   */
  registrar(params: {
    tipo: TipoActividad;
    descripcion: string;
    usuarioId?: string;
    ip?: string;
  }) {
    return this.prisma.registroActividad.create({ data: params });
  }

  findAll(filtros: { tipo?: TipoActividad; usuarioId?: string } = {}) {
    return this.prisma.registroActividad.findMany({
      where: {
        ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
        ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
      },
      orderBy: { fecha: 'desc' },
      take: 200,
      include: {
        usuario: { select: { id: true, nombre: true, correo: true } },
      },
    });
  }

  findForUsuario(usuarioId: string) {
    return this.prisma.registroActividad.findMany({
      where: { usuarioId },
      orderBy: { fecha: 'desc' },
      take: 200,
    });
  }
}
