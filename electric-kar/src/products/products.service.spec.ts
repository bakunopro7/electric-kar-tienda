import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

async function makeService(prisma: any): Promise<ProductsService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return moduleRef.get(ProductsService);
}

describe('ProductsService', () => {
  let prisma: any;
  let service: ProductsService;

  beforeEach(async () => {
    prisma = {
      producto: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      // findAll usa la forma de array de $transaction
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    service = await makeService(prisma);
  });

  describe('findAll', () => {
    it('aplica paginación por defecto y calcula meta', async () => {
      prisma.producto.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.producto.count.mockResolvedValue(45);

      const res = await service.findAll({} as any);

      expect(res.data).toHaveLength(2);
      expect(res.meta).toEqual({ total: 45, page: 1, limit: 20, pages: 3 });
      // page 1, limit 20 -> skip 0, take 20
      const findArgs = prisma.producto.findMany.mock.calls[0][0];
      expect(findArgs.skip).toBe(0);
      expect(findArgs.take).toBe(20);
    });

    it('calcula el offset para páginas posteriores', async () => {
      prisma.producto.findMany.mockResolvedValue([]);
      prisma.producto.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 10 } as any);

      const findArgs = prisma.producto.findMany.mock.calls[0][0];
      expect(findArgs.skip).toBe(20); // (3-1)*10
      expect(findArgs.take).toBe(10);
    });

    it('construye filtro de búsqueda por nombre y sku', async () => {
      prisma.producto.findMany.mockResolvedValue([]);
      prisma.producto.count.mockResolvedValue(0);

      await service.findAll({ search: 'batería', categoriaId: 'cat-1' } as any);

      const where = prisma.producto.findMany.mock.calls[0][0].where;
      expect(where.categoriaId).toBe('cat-1');
      expect(where.OR).toEqual([
        { nombre: { contains: 'batería', mode: 'insensitive' } },
        { sku: { contains: 'batería', mode: 'insensitive' } },
      ]);
    });
  });

  describe('findOne', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.producto.findUnique.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('traduce P2002 (SKU duplicado) a Conflict', async () => {
      prisma.producto.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '7.8.0',
        }),
      );
      await expect(service.create({ sku: 'X' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('traduce P2003 (FK inválida) a BadRequest', async () => {
      prisma.producto.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('fk', {
          code: 'P2003',
          clientVersion: '7.8.0',
        }),
      );
      await expect(service.create({ sku: 'X' } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
