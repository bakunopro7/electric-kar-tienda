import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCupon, Prisma, TipoCupon } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CuponesService } from './cupones.service';

function buildCupon(overrides: Partial<any> = {}) {
  return {
    id: 'cup-1',
    codigo: 'VERANO20',
    tipo: TipoCupon.PORCENTAJE,
    valor: new Prisma.Decimal(20),
    estado: EstadoCupon.ACTIVO,
    fechaInicio: new Date('2020-01-01'),
    fechaFin: new Date('2999-01-01'),
    limiteTotal: null,
    usos: 0,
    compraMinima: new Prisma.Decimal(0),
    ...overrides,
  };
}

async function makeService(prisma: any): Promise<CuponesService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [CuponesService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return moduleRef.get(CuponesService);
}

describe('CuponesService', () => {
  let prisma: any;
  let service: CuponesService;

  beforeEach(async () => {
    prisma = {
      cupon: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = await makeService(prisma);
  });

  describe('validate', () => {
    it('lanza NotFound si el cupón no existe', async () => {
      prisma.cupon.findUnique.mockResolvedValue(null);
      await expect(
        service.validate({ codigo: 'X', subtotal: 100 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza un cupón con estado EXPIRADO', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ estado: EstadoCupon.EXPIRADO }),
      );
      await expect(
        service.validate({ codigo: 'VERANO20', subtotal: 100 }),
      ).rejects.toThrow(/expirado/);
    });

    it('rechaza un cupón cuya fecha fin ya pasó', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ fechaFin: new Date('2020-02-01') }),
      );
      await expect(
        service.validate({ codigo: 'VERANO20', subtotal: 100 }),
      ).rejects.toThrow(/expirado/);
    });

    it('rechaza un cupón que aún no está vigente', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ fechaInicio: new Date('2999-01-01') }),
      );
      await expect(
        service.validate({ codigo: 'VERANO20', subtotal: 100 }),
      ).rejects.toThrow(/aún no está vigente/);
    });

    it('rechaza un cupón que alcanzó su límite de usos', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ limiteTotal: 5, usos: 5 }),
      );
      await expect(
        service.validate({ codigo: 'VERANO20', subtotal: 100 }),
      ).rejects.toThrow(/límite de usos/);
    });

    it('rechaza cuando no se alcanza la compra mínima', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ compraMinima: new Prisma.Decimal(500) }),
      );
      await expect(
        service.validate({ codigo: 'VERANO20', subtotal: 100 }),
      ).rejects.toThrow(/Compra mínima/);
    });

    it('calcula el descuento de un cupón de porcentaje', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ tipo: TipoCupon.PORCENTAJE, valor: new Prisma.Decimal(20) }),
      );
      const r = await service.validate({ codigo: 'VERANO20', subtotal: 1500 });
      expect(r.descuento.toString()).toBe('300'); // 20% de 1500
      expect(r.envioGratis).toBe(false);
    });

    it('limita el monto fijo al subtotal', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ tipo: TipoCupon.MONTO_FIJO, valor: new Prisma.Decimal(200) }),
      );
      const r = await service.validate({ codigo: 'VERANO20', subtotal: 150 });
      expect(r.descuento.toString()).toBe('150'); // min(200, 150)
    });

    it('marca envío gratis sin descontar del subtotal', async () => {
      prisma.cupon.findUnique.mockResolvedValue(
        buildCupon({ tipo: TipoCupon.ENVIO_GRATIS }),
      );
      const r = await service.validate({ codigo: 'VERANO20', subtotal: 1500 });
      expect(r.envioGratis).toBe(true);
      expect(r.descuento.toString()).toBe('0');
    });
  });

  describe('create', () => {
    it('traduce el código P2002 a un ConflictException', async () => {
      prisma.cupon.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '7.8.0',
        }),
      );
      await expect(
        service.create({
          codigo: 'VERANO20',
          fechaInicio: '2026-01-01',
          fechaFin: '2026-12-31',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.cupon.findUnique.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
