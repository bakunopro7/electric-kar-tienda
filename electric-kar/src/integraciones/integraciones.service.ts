import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigPickupDto } from './dto/config-pickup.dto';
import { CreateIntegracionDto } from './dto/create-integracion.dto';
import { UpdateIntegracionDto } from './dto/update-integracion.dto';
import { UpsertMetodoPagoDto } from './dto/upsert-metodo-pago.dto';

@Injectable()
export class IntegracionesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Integraciones --------------------------------------------------------

  create(dto: CreateIntegracionDto) {
    const data: Prisma.IntegracionUncheckedCreateInput = {
      tipo: dto.tipo,
      proveedor: dto.proveedor,
      modo: dto.modo,
      webhookUrl: dto.webhookUrl,
      estado: dto.estado,
    };
    if (dto.credenciales !== undefined) {
      data.credenciales = dto.credenciales as Prisma.InputJsonValue;
    }
    if (dto.opciones !== undefined) {
      data.opciones = dto.opciones as Prisma.InputJsonValue;
    }
    return this.prisma.integracion.create({ data });
  }

  findAll(tipo?: Prisma.IntegracionWhereInput['tipo']) {
    return this.prisma.integracion.findMany({
      where: tipo ? { tipo } : undefined,
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string) {
    const integracion = await this.prisma.integracion.findUnique({
      where: { id },
    });
    if (!integracion) {
      throw new NotFoundException('Integración no encontrada');
    }
    return integracion;
  }

  async update(id: string, dto: UpdateIntegracionDto) {
    await this.findOne(id);
    const { credenciales, opciones, ...rest } = dto;
    const data: Prisma.IntegracionUncheckedUpdateInput = { ...rest };
    if (credenciales !== undefined) {
      data.credenciales = credenciales as Prisma.InputJsonValue;
    }
    if (opciones !== undefined) {
      data.opciones = opciones as Prisma.InputJsonValue;
    }
    return this.prisma.integracion.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.integracion.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Métodos de pago ------------------------------------------------------

  listMetodosPago() {
    return this.prisma.metodoPago.findMany({ orderBy: { nombre: 'asc' } });
  }

  upsertMetodoPago(dto: UpsertMetodoPagoDto) {
    return this.prisma.metodoPago.upsert({
      where: { codigo: dto.codigo },
      create: dto,
      update: {
        nombre: dto.nombre,
        comision: dto.comision,
        activo: dto.activo,
        proveedorId: dto.proveedorId,
      },
    });
  }

  // --- Configuración de Pick up --------------------------------------------

  async getConfigPickup() {
    return this.prisma.configPickup.findFirst();
  }

  async setConfigPickup(dto: ConfigPickupDto) {
    const existing = await this.prisma.configPickup.findFirst();
    if (existing) {
      return this.prisma.configPickup.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.prisma.configPickup.create({ data: dto });
  }
}
