import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /** Menú público: solo elementos visibles, ordenados. */
  findVisible() {
    return this.prisma.menuItem.findMany({
      where: { visible: true },
      orderBy: { orden: 'asc' },
    });
  }

  /** Todos los elementos (gestión en panel). */
  findAll() {
    return this.prisma.menuItem.findMany({ orderBy: { orden: 'asc' } });
  }

  create(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({ data: dto });
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    await this.ensureExists(id);
    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.menuItem.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Elemento de menú no encontrado');
    }
  }
}
