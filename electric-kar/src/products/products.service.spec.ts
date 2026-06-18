import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { ProductIndexService } from './search/product-index.service';

const mockPrisma = {
  $transaction: jest.fn(),
  producto: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockProductIndex = {
  upsert: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  // ProductsService.searchFallback re-uses the shared flatten() through the
  // index service, so it must be present on the mock.
  flatten: jest.fn((row: { id: string }) => ({ id: row.id })),
};

describe('ProductsService write-through (best-effort index sync)', () => {
  let service: ProductsService;
  let warnSpy: jest.SpyInstance;

  const fakeRow = { id: 'p-1', nombre: 'Batería', sku: 'ABC-1' };
  const fakeWithRelations = {
    ...fakeRow,
    marca: { nombre: 'Bosch' },
    categoria: { nombre: 'Baterías' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductIndexService, useValue: mockProductIndex },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
    // Silence (and assert) the warn logged when the index op fails.
    warnSpy = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => warnSpy.mockRestore());

  describe('create', () => {
    it('returns the Postgres row even when the index upsert throws (logged, no throw)', async () => {
      mockPrisma.producto.create.mockResolvedValue(fakeRow);
      mockPrisma.producto.findUnique.mockResolvedValue(fakeWithRelations);
      mockProductIndex.upsert.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.create({} as CreateProductDto);

      expect(result).toBe(fakeRow);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('indexes the relation-loaded product on success', async () => {
      mockPrisma.producto.create.mockResolvedValue(fakeRow);
      mockPrisma.producto.findUnique.mockResolvedValue(fakeWithRelations);
      mockProductIndex.upsert.mockResolvedValue(undefined);

      const result = await service.create({} as CreateProductDto);

      expect(result).toBe(fakeRow);
      // Re-read with relations is what gets flattened/indexed.
      expect(mockProductIndex.upsert).toHaveBeenCalledWith(fakeWithRelations);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns the Postgres row even when the index upsert throws', async () => {
      mockPrisma.producto.findUnique.mockResolvedValue(fakeWithRelations);
      mockPrisma.producto.update.mockResolvedValue(fakeRow);
      mockProductIndex.upsert.mockRejectedValue(new Error('500 Server Error'));

      const result = await service.update('p-1', {} as UpdateProductDto);

      expect(result).toBe(fakeRow);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('returns the Postgres delete result even when the index delete throws', async () => {
      mockPrisma.producto.findUnique.mockResolvedValue(fakeWithRelations);
      mockPrisma.producto.delete.mockResolvedValue(fakeRow);
      mockProductIndex.delete.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.remove('p-1');

      expect(result).toEqual({ deleted: true });
      expect(warnSpy).toHaveBeenCalled();
    });

    it('does not throw when deleting a product missing from the index (no-op)', async () => {
      mockPrisma.producto.findUnique.mockResolvedValue(fakeWithRelations);
      mockPrisma.producto.delete.mockResolvedValue(fakeRow);
      // ProductIndexService.delete swallows missing docs -> resolves undefined.
      mockProductIndex.delete.mockResolvedValue(undefined);

      const result = await service.remove('p-1');

      expect(result).toEqual({ deleted: true });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('ProductsService.searchPublic fallback (Typesense unavailable)', () => {
  let service: ProductsService;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductIndexService, useValue: mockProductIndex },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
    warnSpy = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => warnSpy.mockRestore());

  it('uses Typesense when healthy and returns its result verbatim', async () => {
    const tsResult = {
      data: [{ id: 'p-1' }],
      meta: { total: 1, page: 1, limit: 20, pages: 1 },
      facets: { categoriaId: [{ value: 'C1', count: 1 }] },
    };
    mockProductIndex.search.mockResolvedValue(tsResult);

    const res = await service.searchPublic(new SearchProductDto());

    expect(res).toBe(tsResult);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('falls back to Prisma and returns { data, meta, facets:{} } when Typesense throws', async () => {
    mockProductIndex.search.mockRejectedValue(new Error('ECONNREFUSED'));
    const rows = [
      { id: 'p-1', estado: 'PUBLICADO' },
      { id: 'p-2', estado: 'PUBLICADO' },
    ];
    mockPrisma.$transaction.mockResolvedValue([rows, 2]);

    const dto = new SearchProductDto();
    dto.q = 'bateria';
    const res = await service.searchPublic(dto);

    expect(res.data).toHaveLength(2);
    expect(res.meta).toEqual({ total: 2, page: 1, limit: 20, pages: 1 });
    expect(res.facets).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
  });

  it('fallback forces estado = PUBLICADO in the Prisma where-clause', async () => {
    mockProductIndex.search.mockRejectedValue(new Error('timeout'));
    mockPrisma.$transaction.mockResolvedValue([[], 0]);
    mockPrisma.producto.findMany.mockResolvedValue([]);
    mockPrisma.producto.count.mockResolvedValue(0);

    await service.searchPublic(new SearchProductDto());

    // The $transaction is built from two prisma builder calls; assert the
    // findMany where-clause locks estado to PUBLICADO so drafts never leak.
    expect(mockPrisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'PUBLICADO' }),
      }),
    );
  });
});
