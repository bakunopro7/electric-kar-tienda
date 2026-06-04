import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';
import { UpdateSegmentoDto } from './dto/update-segmento.dto';

/** Campos públicos del cliente (sin el hash de contraseña). */
const clienteSelect = {
  id: true,
  nombre: true,
  correo: true,
  telefono: true,
  segmento: true,
  rfc: true,
  pedidosCount: true,
  totalGastado: true,
  creadoEn: true,
} satisfies Prisma.ClienteSelect;

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Perfil propio (cliente) ---------------------------------------------

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: clienteSelect,
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return cliente;
  }

  async updateProfile(id: string, dto: UpdateClienteDto) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: dto,
      select: clienteSelect,
    });
  }

  // --- Direcciones (cliente) -----------------------------------------------

  listAddresses(clienteId: string) {
    return this.prisma.direccion.findMany({
      where: { clienteId },
      orderBy: { creadoEn: 'asc' },
    });
  }

  addAddress(clienteId: string, dto: CreateDireccionDto) {
    return this.prisma.direccion.create({ data: { ...dto, clienteId } });
  }

  async updateAddress(
    clienteId: string,
    direccionId: string,
    dto: UpdateDireccionDto,
  ) {
    await this.ensureAddressOwner(clienteId, direccionId);
    return this.prisma.direccion.update({ where: { id: direccionId }, data: dto });
  }

  async removeAddress(clienteId: string, direccionId: string) {
    await this.ensureAddressOwner(clienteId, direccionId);
    await this.prisma.direccion.delete({ where: { id: direccionId } });
    return { deleted: true };
  }

  // --- Gestión (personal del panel) ----------------------------------------

  findAll() {
    return this.prisma.cliente.findMany({
      orderBy: { creadoEn: 'desc' },
      select: clienteSelect,
    });
  }

  findOneWithAddresses(id: string) {
    return this.prisma.cliente
      .findUnique({ where: { id }, select: { ...clienteSelect, direcciones: true } })
      .then((c) => {
        if (!c) throw new NotFoundException('Cliente no encontrado');
        return c;
      });
  }

  async updateSegmento(id: string, dto: UpdateSegmentoDto) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: { segmento: dto.segmento },
      select: clienteSelect,
    });
  }

  // --- Helpers --------------------------------------------------------------

  private async ensureAddressOwner(clienteId: string, direccionId: string) {
    const direccion = await this.prisma.direccion.findUnique({
      where: { id: direccionId },
    });
    if (!direccion || direccion.clienteId !== clienteId) {
      throw new NotFoundException('Dirección no encontrada');
    }
  }
}
