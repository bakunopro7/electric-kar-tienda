import { Test, TestingModule } from '@nestjs/testing';
import { ClientesService } from './clientes.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  cliente: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('ClientesService.findAll', () => {
  let service: ClientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ClientesService>(ClientesService);
    jest.clearAllMocks();
  });

  it('(a) default pagination: returns { data, meta } with correct shape', async () => {
    const clientes = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    mockPrisma.$transaction.mockResolvedValue([clientes, 55]);

    const result = await service.findAll();

    expect(result).toEqual({
      data: clientes,
      meta: { total: 55, page: 1, limit: 20, pages: 3 },
    });
  });

  it('(b) page 3 navigation: returns remaining 15 items', async () => {
    const clientes = Array.from({ length: 15 }, (_, i) => ({ id: String(i) }));
    mockPrisma.$transaction.mockResolvedValue([clientes, 55]);

    const result = await service.findAll(3, 20);

    expect(result.data).toHaveLength(15);
    expect(result.meta.page).toBe(3);
    expect(result.meta.pages).toBe(3);
  });

  it('(c) limit clamped to 100', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0]);

    const result = await service.findAll(1, 999);

    expect(result.meta.limit).toBe(100);
  });

  it('(d) page beyond range returns empty data with correct meta', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 3]);

    const result = await service.findAll(50, 20);

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(3);
    expect(result.meta.pages).toBe(1);
  });
});

describe('ClientesService.findTop', () => {
  let service: ClientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ClientesService>(ClientesService);
    jest.clearAllMocks();
  });

  it('(a) returns top N by totalGastado desc (plain array, no envelope)', async () => {
    const top5 = Array.from({ length: 5 }, (_, i) => ({ id: String(i), totalGastado: String((5 - i) * 100) }));
    mockPrisma.cliente.findMany.mockResolvedValue(top5);

    const result = await service.findTop();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(5);
  });

  it('(b) default limit is 5', async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([]);

    await service.findTop();

    expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });

  it('(c) limit clamped to 50', async () => {
    mockPrisma.cliente.findMany.mockResolvedValue([]);

    await service.findTop(200);

    expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});

describe('ClientesService.stats', () => {
  let service: ClientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ClientesService>(ClientesService);
    jest.clearAllMocks();
  });

  it('(a) returns { total } from prisma.cliente.count()', async () => {
    mockPrisma.cliente.count.mockResolvedValue(42);

    const result = await service.stats();

    expect(result).toEqual({ total: 42 });
  });

  it('(b) returns { total: 0 } when no clientes exist', async () => {
    mockPrisma.cliente.count.mockResolvedValue(0);

    const result = await service.stats();

    expect(result).toEqual({ total: 0 });
  });
});
