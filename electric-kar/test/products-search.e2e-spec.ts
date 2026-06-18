/**
 * Integration test — Task 9.6: `GET /api/products/search` against a LIVE
 * Typesense + Postgres through the full Nest HTTP stack.
 *
 * INFRA-GATED: requires a reachable Typesense (8108) and Postgres. SKIPPED
 * unless `RUN_SEARCH_INTEGRATION=1`. Run locally with:
 *   docker compose up -d db typesense
 *   RUN_SEARCH_INTEGRATION=1 pnpm test:e2e products-search
 *
 * Asserts (per product-search-api spec):
 *  - typo query returns ranked hits,
 *  - facet_counts are present,
 *  - BORRADOR/PROGRAMADO never surface in data / facets / meta.total,
 *  - a SKU exact-ish query ranks the matching product first.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductIndexService } from '../src/products/search/product-index.service';

const RUN = process.env.RUN_SEARCH_INTEGRATION === '1';
const describeIntegration = RUN ? describe : describe.skip;

describeIntegration('GET /api/products/search (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let index: ProductIndexService;
  const seededIds: string[] = [];
  const tag = `e2e-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    index = app.get(ProductIndexService);

    // Seed: 1 published "Batería de Litio", 1 published SKU target,
    // 1 BORRADOR and 1 PROGRAMADO that also match — they MUST NOT surface.
    const seed = async (data: Record<string, unknown>) => {
      const row = await prisma.producto.create({
        data: { etiquetas: [tag], ...data } as never,
      });
      seededIds.push(row.id);
      return row;
    };

    await seed({
      nombre: 'Batería de Litio',
      sku: `BAT-${tag}`,
      precio: '1499.99',
      estado: 'PUBLICADO',
    });
    await seed({
      nombre: 'Cargador rápido',
      sku: `ABC-12345-${tag}`,
      precio: '299.00',
      estado: 'PUBLICADO',
    });
    await seed({
      nombre: 'Batería de Litio (borrador)',
      sku: `BATB-${tag}`,
      precio: '10.00',
      estado: 'BORRADOR',
    });
    await seed({
      nombre: 'Batería de Litio (programada)',
      sku: `BATP-${tag}`,
      precio: '10.00',
      estado: 'PROGRAMADO',
    });

    // Push seeded rows into the live index.
    await index.reindexAll();
  });

  afterAll(async () => {
    if (seededIds.length) {
      await prisma.producto.deleteMany({ where: { id: { in: seededIds } } });
      // Limpiar también el índice: sin esto, los docs quedan huérfanos en la
      // colección viva y el `search:reindex` (upsert) ya no converge.
      await Promise.all(seededIds.map((id) => index.delete(id)));
    }
    await app.close();
  });

  const search = (qs: string) =>
    request(app.getHttpServer())
      .get(`/api/products/search?etiquetas=${tag}&${qs}`)
      .expect(200);

  it('typo query returns ranked hits and facet counts', async () => {
    // "bateira" = transposed "bateria"
    const res = await search('q=bateira');

    const nombres = res.body.data.map((d: { nombre: string }) => d.nombre);
    expect(nombres).toContain('Batería de Litio');
    expect(res.body.facets).toBeDefined();
    // Facet counts for at least categoriaId/marcaId/etiquetas requested.
    expect(Object.keys(res.body.facets).length).toBeGreaterThan(0);
  });

  it('never surfaces BORRADOR / PROGRAMADO products', async () => {
    const res = await search('q=bateria');

    const estados = res.body.data.map((d: { estado: string }) => d.estado);
    expect(estados).not.toContain('BORRADOR');
    expect(estados).not.toContain('PROGRAMADO');
    // Only the single PUBLICADO "Batería de Litio" matches within this tag.
    expect(res.body.meta.total).toBe(1);

    // And the excluded states must not appear in facet buckets either.
    const estadoFacet = res.body.facets.estado ?? [];
    const facetValues = estadoFacet.map((f: { value: string }) => f.value);
    expect(facetValues).not.toContain('BORRADOR');
    expect(facetValues).not.toContain('PROGRAMADO');
  });

  it('SKU exact-ish query ranks the matching product first', async () => {
    const res = await search(`q=ABC-12345-${tag}`);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].sku).toBe(`ABC-12345-${tag}`);
  });
});
