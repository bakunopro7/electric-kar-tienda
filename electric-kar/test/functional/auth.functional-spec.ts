import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from './helpers/app';
import { generateToken } from './helpers/auth';
import { truncateAll } from './helpers/db';
import { CLIENTE_PASSWORD, STAFF_PASSWORD, seedBaseline } from './helpers/seed';

describe('Auth (functional)', () => {
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
  // Registration
  // ---------------------------------------------------------------------------

  describe('POST /api/auth/register', () => {
    it('valid input → 201 + user persisted in DB', async () => {
      const correo = 'nuevo@x.com';
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ correo, password: 'password123', nombre: 'Nuevo Usuario' });

      expect(res.status).toBe(201);

      const row = await prisma.cliente.findUnique({ where: { correo } });
      expect(row).not.toBeNull();
      expect(row!.correo).toBe(correo);
    });

    it('duplicate email → 409', async () => {
      // seedBaseline already creates cliente@test.mx
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ correo: 'cliente@test.mx', password: 'password123', nombre: 'Dup' });

      expect(res.status).toBe(409);
    });

    it('correo > 254 chars → 400', async () => {
      const longEmail = 'a'.repeat(246) + '@x.com'; // 246+6 = 252... need 255
      const tooLong = 'a'.repeat(248) + '@x.com'; // 254+1=255
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ correo: tooLong, password: 'password123', nombre: 'Long' });

      expect(res.status).toBe(400);
    });

    it('missing password → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ correo: 'no-pass@x.com', nombre: 'No Pass' });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Cliente Login
  // ---------------------------------------------------------------------------

  describe('POST /api/auth/login', () => {
    it('correct credentials → 200 + accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: 'cliente@test.mx', password: CLIENTE_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('wrong password → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: 'cliente@test.mx', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });

    it('mixed-case + padded email → 200 (normalization)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: '  CLIENTE@TEST.MX  ', password: CLIENTE_PASSWORD });

      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Staff Login
  // ---------------------------------------------------------------------------

  describe('POST /api/auth/staff/login', () => {
    it('valid staff credentials → 200 + accessToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/staff/login')
        .send({ correo: 'admin@test.mx', password: STAFF_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('wrong staff password → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/staff/login')
        .send({ correo: 'admin@test.mx', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/auth/me
  // ---------------------------------------------------------------------------

  describe('GET /api/auth/me', () => {
    it('valid JWT (staff) → 200 + identity body', async () => {
      const staffRow = await prisma.usuario.findUnique({
        where: { correo: 'admin@test.mx' },
      });
      const token = generateToken(app, {
        sub: staffRow!.id,
        correo: staffRow!.correo,
        tipo: 'usuario',
        rol: staffRow!.rol,
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('valid JWT (cliente) → 200 + identity body', async () => {
      const clienteRow = await prisma.cliente.findUnique({
        where: { correo: 'cliente@test.mx' },
      });
      const token = generateToken(app, {
        sub: clienteRow!.id,
        correo: clienteRow!.correo,
        tipo: 'cliente',
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('no token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('invalid token string → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });
});
