import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContenidoService {
  constructor(private readonly prisma: PrismaService) {}

  findFeatures() {
    return this.prisma.feature.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
      select: {
        id: true,
        icono: true,
        titulo: true,
        texto: true,
        orden: true,
      },
    });
  }

  findPromo() {
    return this.prisma.promo.findFirst({
      where: { activo: true },
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        badge: true,
        titulo: true,
        texto: true,
        descuento: true,
        fechaFin: true,
        ctaTexto: true,
        ctaUrl: true,
      },
    });
  }
}
