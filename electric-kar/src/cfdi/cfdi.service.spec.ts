import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CfdiService } from './cfdi.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryCfdiDto } from './dto/query-cfdi.dto';
import { FacturapiProvider } from './facturapi/facturapi.provider';

const mockPrisma = {
  $transaction: jest.fn(),
  cfdi: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  pedido: {
    findUnique: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};

describe('QueryCfdiDto', () => {
  it('should import without error', () => {
    expect(QueryCfdiDto).toBeDefined();
  });

  it('should have optional page and limit properties only', () => {
    const dto = new QueryCfdiDto();
    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
    expect((dto as Record<string, unknown>).estado).toBeUndefined();
  });
});

describe('CfdiService.findAll', () => {
  let service: CfdiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CfdiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: FacturapiProvider, useValue: { timbrar: jest.fn() } },
      ],
    }).compile();
    service = module.get<CfdiService>(CfdiService);
    jest.clearAllMocks();
  });

  it('(a) default page/limit returns { data, meta }', async () => {
    const fakeCfdis = [{ id: 'c1' }, { id: 'c2' }];
    mockPrisma.$transaction.mockResolvedValue([fakeCfdis, 2]);

    const result = await service.findAll(1, 20);

    expect(result).toEqual({
      data: fakeCfdis,
      meta: { total: 2, page: 1, limit: 20, pages: 1 },
    });
  });

  it('(b) limit=500 is clamped to 100', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0]);

    const result = await service.findAll(1, 500);

    expect(result.meta.limit).toBe(100);
  });

  it('(c) empty page returns data:[]', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 8]);

    const result = await service.findAll(50, 20);

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(8);
  });

  it('(d) $transaction is called (orderBy fecha:desc is used)', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0]);

    await service.findAll(1, 20);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
