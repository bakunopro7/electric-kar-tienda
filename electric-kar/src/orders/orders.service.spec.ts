import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { EstadoPedido, Prisma } from '../generated/prisma/client';

const mockPrisma = {
  $transaction: jest.fn(),
  pedido: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('QueryOrdersDto', () => {
  it('should import without error', () => {
    expect(QueryOrdersDto).toBeDefined();
  });

  it('should have optional page, limit, and estado properties', () => {
    const dto = new QueryOrdersDto();
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
    expect(dto.estado).toBeUndefined();
  });
});

describe('OrdersService.findAll', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('(a) default page/limit returns { data, meta }', async () => {
    const fakeOrders = [{ id: '1' }, { id: '2' }];
    mockPrisma.$transaction.mockResolvedValue([fakeOrders, 2]);

    const result = await service.findAll(1, 20);

    expect(result).toEqual({
      data: fakeOrders,
      meta: { total: 2, page: 1, limit: 20, pages: 1 },
    });
  });

  it('(b) limit=200 is clamped to 100', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0]);

    const result = await service.findAll(1, 200);

    expect(result.meta.limit).toBe(100);
  });

  it('(c) estado filter is passed (transaction is called)', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 5]);

    await service.findAll(1, 20, EstadoPedido.ENTREGADO);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('(d) empty page returns data:[] with correct meta.total', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 5]);

    const result = await service.findAll(99, 20);

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(5);
    expect(result.meta.pages).toBe(1);
  });
});

describe('OrdersService.stats', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('(a) 3 orders totaling 600 → { ventasTotal:"600.00", pedidosCount:3, ticketPromedio:"200.00" }', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      { _sum: { total: new Prisma.Decimal(600) } },
      3,
    ]);

    const result = await service.stats();

    expect(result).toEqual({
      ventasTotal: '600.00',
      pedidosCount: 3,
      ticketPromedio: '200.00',
    });
  });

  it('(b) 0 orders → all fields are "0.00" / 0', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      { _sum: { total: null } },
      0,
    ]);

    const result = await service.stats();

    expect(result).toEqual({
      ventasTotal: '0.00',
      pedidosCount: 0,
      ticketPromedio: '0.00',
    });
  });

  it('(c) ventasTotal is a string (not a number)', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      { _sum: { total: new Prisma.Decimal(1234.56) } },
      10,
    ]);

    const result = await service.stats();

    expect(typeof result.ventasTotal).toBe('string');
    expect(typeof result.ticketPromedio).toBe('string');
  });
});
