import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchProductDto } from '../dto/search-product.dto';
import { ProductoWithRelations } from './product-document';
import { ProductIndexService } from './product-index.service';
import { TypesenseService } from './typesense.service';

/**
 * Builds a full `Producto` (+ relations) fixture. Overrides let each test tweak
 * only the field under assertion while keeping the row valid.
 */
function buildProducto(
  overrides: Partial<ProductoWithRelations> = {},
): ProductoWithRelations {
  const base = {
    id: 'p-1',
    nombre: 'Batería de Litio',
    sku: 'ABC-12345',
    codigoBarras: '7501234567890',
    descripcion: 'Una batería de litio recargable',
    descripcionCorta: 'Batería recargable',
    categoriaId: 'cat-1',
    marcaId: 'marca-1',
    precio: new Prisma.Decimal('1499.99'),
    precioComparativo: null,
    costo: null,
    tasaIva: 16,
    existencias: 42,
    stockMinimo: 5,
    seguirInventario: true,
    permitirSinStock: false,
    claveProdSat: null,
    pesoKg: null,
    claseEnvio: 'ESTANDAR',
    estado: 'PUBLICADO',
    etiquetas: ['litio', 'recargable'],
    imagenes: [],
    creadoEn: new Date('2026-01-15T10:30:00.000Z'),
    actualizadoEn: new Date('2026-01-15T10:30:00.000Z'),
    marca: { id: 'marca-1', nombre: 'Bosch' },
    categoria: { id: 'cat-1', nombre: 'Baterías' },
  } as unknown as ProductoWithRelations;

  return { ...base, ...overrides };
}

describe('ProductIndexService', () => {
  let service: ProductIndexService;
  let typesense: {
    isHealthy: jest.Mock;
    upsertDocument: jest.Mock;
    deleteDocument: jest.Mock;
    search: jest.Mock;
    import: jest.Mock;
  };

  const mockPrisma = {
    producto: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    typesense = {
      isHealthy: jest.fn().mockReturnValue(true),
      upsertDocument: jest.fn().mockResolvedValue(undefined),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
      search: jest.fn(),
      import: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductIndexService,
        { provide: TypesenseService, useValue: typesense },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductIndexService>(ProductIndexService);
    jest.clearAllMocks();
    typesense.isHealthy.mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // 9.1 flatten()
  // -------------------------------------------------------------------------
  describe('flatten()', () => {
    it('casts Decimal precio 1499.99 to the number 1499.99 (not string/Decimal)', () => {
      const doc = service.flatten(buildProducto());

      expect(doc.precio).toBe(1499.99);
      expect(typeof doc.precio).toBe('number');
      expect(doc.precio).not.toBeInstanceOf(Prisma.Decimal);
    });

    it('serializes creadoEn to an epoch int64 (millis)', () => {
      const creadoEn = new Date('2026-01-15T10:30:00.000Z');
      const doc = service.flatten(buildProducto({ creadoEn }));

      expect(doc.creadoEn).toBe(creadoEn.getTime());
      expect(Number.isInteger(doc.creadoEn)).toBe(true);
    });

    it('omits null marcaId/categoriaId and optional text fields', () => {
      const doc = service.flatten(
        buildProducto({
          marcaId: null,
          categoriaId: null,
          marca: null,
          categoria: null,
          codigoBarras: null,
          descripcion: null,
          descripcionCorta: null,
        }),
      );

      expect(doc.marcaId).toBeUndefined();
      expect(doc.categoriaId).toBeUndefined();
      expect(doc.marcaNombre).toBeUndefined();
      expect(doc.categoriaNombre).toBeUndefined();
      expect(doc.codigoBarras).toBeUndefined();
      expect(doc.descripcion).toBeUndefined();
      expect(doc.descripcionCorta).toBeUndefined();
      // Document is still searchable by its text fields.
      expect(doc.nombre).toBe('Batería de Litio');
      expect(doc.sku).toBe('ABC-12345');
    });

    it('denormalizes marcaNombre/categoriaNombre from relations', () => {
      const doc = service.flatten(buildProducto());

      expect(doc.marcaNombre).toBe('Bosch');
      expect(doc.categoriaNombre).toBe('Baterías');
      expect(doc.marcaId).toBe('marca-1');
      expect(doc.categoriaId).toBe('cat-1');
    });

    it('defaults etiquetas to [] when absent/null', () => {
      const doc = service.flatten(
        buildProducto({ etiquetas: null as unknown as string[] }),
      );

      expect(doc.etiquetas).toEqual([]);
    });

    it('passes imagenes through (defaults to [] when absent/null)', () => {
      const withImgs = service.flatten(
        buildProducto({ imagenes: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] }),
      );
      expect(withImgs.imagenes).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);

      const without = service.flatten(
        buildProducto({ imagenes: null as unknown as string[] }),
      );
      expect(without.imagenes).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 9.2 search() filter injection
  // -------------------------------------------------------------------------
  describe('search() filter injection', () => {
    function mockEmptySearch() {
      typesense.search.mockResolvedValue({
        found: 0,
        page: 1,
        hits: [],
        facet_counts: [],
      });
    }

    function lastSearchParams() {
      return typesense.search.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    }

    it('ALWAYS injects estado:=PUBLICADO into filter_by', async () => {
      mockEmptySearch();

      await service.search(new SearchProductDto());

      expect(lastSearchParams().filter_by).toContain('estado:=PUBLICADO');
    });

    it('appends category, brand and tag filters from the DTO', async () => {
      mockEmptySearch();

      const dto = new SearchProductDto();
      dto.categoriaId = 'cat-9';
      dto.marcaId = 'marca-9';
      dto.etiquetas = ['litio', 'recargable'];

      await service.search(dto);

      const filterBy = lastSearchParams().filter_by as string;
      expect(filterBy).toContain('estado:=PUBLICADO');
      expect(filterBy).toContain('categoriaId:=cat-9');
      expect(filterBy).toContain('marcaId:=marca-9');
      expect(filterBy).toContain('etiquetas:=[`litio`,`recargable`]');
    });

    it('ignores a client-supplied estado (only PUBLICADO is enforced)', async () => {
      mockEmptySearch();

      const dto = new SearchProductDto();
      // Simulate a malicious/extra estado field that is NOT part of the DTO.
      (dto as Record<string, unknown>).estado = 'BORRADOR';

      await service.search(dto);

      const filterBy = lastSearchParams().filter_by as string;
      expect(filterBy).toContain('estado:=PUBLICADO');
      expect(filterBy).not.toContain('BORRADOR');
    });

    it('sets num_typos to 0 for the sku field (5th query field)', async () => {
      mockEmptySearch();

      await service.search(new SearchProductDto());

      const params = lastSearchParams();
      // query_by order: nombre,etiquetas,marcaNombre,categoriaNombre,sku,...
      expect(params.query_by).toBe(
        'nombre,etiquetas,marcaNombre,categoriaNombre,sku,descripcionCorta,descripcion',
      );
      // num_typos must be 0 for the sku slot so part numbers match exactly.
      expect(params.num_typos).toBe('1,1,1,1,0,1,1');
    });

    it('maps sort=precio_asc/desc to precio sort and defaults to text-match relevance', async () => {
      mockEmptySearch();

      const asc = new SearchProductDto();
      asc.sort = 'precio_asc';
      await service.search(asc);
      expect(lastSearchParams().sort_by).toBe('precio:asc');

      const desc = new SearchProductDto();
      desc.sort = 'precio_desc';
      await service.search(desc);
      expect(lastSearchParams().sort_by).toBe('precio:desc');

      await service.search(new SearchProductDto());
      expect(lastSearchParams().sort_by).toBe('_text_match:desc,creadoEn:desc');
    });

    it('maps the Typesense response to { data, meta, facets }', async () => {
      typesense.search.mockResolvedValue({
        found: 30,
        page: 1,
        hits: [
          { document: { id: 'p-1', nombre: 'A' } },
          { document: { id: 'p-2', nombre: 'B' } },
        ],
        facet_counts: [
          {
            field_name: 'categoriaId',
            counts: [
              { value: 'C1', count: 7 },
              { value: 'C2', count: 3 },
            ],
          },
        ],
      });

      const dto = new SearchProductDto();
      dto.perPage = 20;
      const res = await service.search(dto);

      expect(res.data).toHaveLength(2);
      expect(res.meta).toEqual({ total: 30, page: 1, limit: 20, pages: 2 });
      expect(res.facets.categoriaId).toEqual([
        { value: 'C1', count: 7 },
        { value: 'C2', count: 3 },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // 9.3 graceful degradation (write no-ops). Search-path fallback lives in
  // products.service.spec.ts where ProductsService owns the Prisma fallback.
  // -------------------------------------------------------------------------
  describe('graceful degradation (Typesense not ready)', () => {
    beforeEach(() => {
      typesense.isHealthy.mockReturnValue(false);
    });

    it('upsert is a no-op (no throw, no transport call) when not ready', async () => {
      await expect(service.upsert(buildProducto())).resolves.toBeUndefined();
      expect(typesense.upsertDocument).not.toHaveBeenCalled();
    });

    it('delete is a no-op (no throw, no transport call) when not ready', async () => {
      await expect(service.delete('p-1')).resolves.toBeUndefined();
      expect(typesense.deleteDocument).not.toHaveBeenCalled();
    });
  });
});
