import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDatosContactoDto } from './dto/update-datos-contacto.dto';

const CONTACTO_ID = 'singleton';
const contactoSelect = {
  direccion: true,
  telefono: true,
  correo: true,
  horario: true,
} as const;

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

  /** Datos de contacto del sitio (singleton). Puede ser `null` si aún no se cargó. */
  findContacto() {
    return this.prisma.datosContacto.findFirst({ select: contactoSelect });
  }

  /** Upsert de la única fila de datos de contacto (editado por admin). */
  updateContacto(dto: UpdateDatosContactoDto) {
    return this.prisma.datosContacto.upsert({
      where: { id: CONTACTO_ID },
      create: { id: CONTACTO_ID, ...dto },
      update: { ...dto },
      select: contactoSelect,
    });
  }
}
