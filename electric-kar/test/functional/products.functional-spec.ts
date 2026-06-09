import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from './helpers/app';
import { generateToken } from './helpers/auth';
import { truncateAll } from './helpers/db';
import { CLIENTE_PASSWORD, seedBaseline } from './helpers/seed';

describe('Products (functional)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await seedBaseline(prisma);
  });

  // ---------------------------------------------------------------------------
  // List / Pagination
  // ---------------------------------------------------------------------------

  describe('GET /api/products', () => {
    it('default call → 200 + body has data[] and meta.{ total, page, limit, pages }', async () => {
      const res = await request(app.getHttpServer()).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('pages');
    });

    it('?page=2&limit=1 → 200 + meta.page=2, meta.limit=1, data.length <= 1', async () => {
      const res = await request(app.getHttpServer()).get('/api/products?page=2&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Get by ID
  // ---------------------------------------------------------------------------

  describe('GET /api/products/:id', () => {
    it('known seeded ID → 200 + product body', async () => {
      const [product] = await prisma.producto.findMany({ take: 1 });
      const res = await request(app.getHttpServer()).get(`/api/products/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', product.id);
    });

    it('unknown UUID → 404', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/products/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Create (RBAC)
  // ---------------------------------------------------------------------------

  describe('POST /api/products', () => {
    it('ADMIN token + valid payload → 201', async () => {
      const staff = await prisma.usuario.findUnique({ where: { correo: 'admin@test.mx' } });
      const cat = await prisma.categoria.findFirst();
      const marca = await prisma.marca.findFirst();

      const token = generateToken(app, {
        sub: staff!.id,
        correo: staff!.correo,
        tipo: 'usuario',
        rol: staff!.rol,
      });

      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'New Product',
          sku: 'NEW-001',
          precio: 99.99,
          categoriaId: cat!.id,
          marcaId: marca!.id,
        });

      expect(res.status).toBe(201);
    });

    it('no token → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .send({ nombre: 'No Auth', sku: 'NO-001', precio: 10 });

      expect(res.status).toBe(401);
    });

    it('cliente token (tipo: "cliente", no rol) → 403', async () => {
      const cliente = await prisma.cliente.findUnique({ where: { correo: 'cliente@test.mx' } });
      const token = generateToken(app, {
        sub: cliente!.id,
        correo: cliente!.correo,
        tipo: 'cliente',
      });

      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Forbidden', sku: 'FBD-001', precio: 10 });

      expect(res.status).toBe(403);
    });

    it('ADMIN token + missing nombre → 400', async () => {
      const staff = await prisma.usuario.findUnique({ where: { correo: 'admin@test.mx' } });
      const token = generateToken(app, {
        sub: staff!.id,
        correo: staff!.correo,
        tipo: 'usuario',
        rol: staff!.rol,
      });

      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ sku: 'NONO-001', precio: 10 }); // missing nombre

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Teardown check: login with existing account after re-seed
  // ---------------------------------------------------------------------------

  describe('RBAC integration sanity', () => {
    it('cliente cannot access product creation even with valid token', async () => {
      // Re-verify after another truncate+seed cycle
      await truncateAll(prisma);
      const fresh = await seedBaseline(prisma);

      const token = generateToken(app, {
        sub: fresh.cliente.id,
        correo: fresh.cliente.correo,
        tipo: 'cliente',
      });

      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Hack', sku: 'HACK-01', precio: 1 });

      expect(res.status).toBe(403);
    });
  });
});
