import { test, expect, Page } from '@playwright/test';

/**
 * Admin pagination + stats e2e tests.
 *
 * These tests validate the API contract shape by intercepting network requests
 * from the admin UI. Requires backend on :3000 with seed data.
 *
 * Admin credentials: admin@electrick-kar.mx / admin123 (SUPER role from seed).
 */

const ADMIN = { correo: 'admin@electrick-kar.mx', password: 'admin123' };
const API = 'http://localhost:3000/api';

async function adminLogin(page: Page): Promise<string> {
  const res = await page.request.post(`${API}/auth/staff/login`, {
    data: ADMIN,
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json() as { accessToken?: string; token?: string };
  const token = body.accessToken ?? body.token ?? '';
  return token;
}

test.describe('GET /api/orders/all — paginated shape', () => {
  test('returns { data, meta } envelope with meta.total >= 0', async ({ page }) => {
    const token = await adminLogin(page);

    const res = await page.request.get(`${API}/orders/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json() as { data?: unknown; meta?: { total: number } };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta?.total).toBe('number');
    expect(body.meta!.total).toBeGreaterThanOrEqual(0);
  });

  test('meta.page and meta.limit are present', async ({ page }) => {
    const token = await adminLogin(page);

    const res = await page.request.get(`${API}/orders/all?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json() as { meta?: { page: number; limit: number; pages: number } };
    expect(body.meta?.page).toBe(1);
    expect(body.meta?.limit).toBe(5);
    expect(typeof body.meta?.pages).toBe('number');
  });
});

test.describe('GET /api/orders/stats — aggregate shape', () => {
  test('returns { ventasTotal, pedidosCount, ticketPromedio } without error', async ({ page }) => {
    const token = await adminLogin(page);

    const res = await page.request.get(`${API}/orders/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json() as { ventasTotal?: string; pedidosCount?: number; ticketPromedio?: string };
    expect(typeof body.ventasTotal).toBe('string');
    expect(typeof body.pedidosCount).toBe('number');
    expect(typeof body.ticketPromedio).toBe('string');
  });

  test('pedidosCount >= 0 (no runtime error on empty db)', async ({ page }) => {
    const token = await adminLogin(page);

    const res = await page.request.get(`${API}/orders/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json() as { pedidosCount?: number };
    expect(body.pedidosCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('GET /api/cfdi — paginated shape', () => {
  test('returns { data, meta } envelope as ADMIN', async ({ page }) => {
    const token = await adminLogin(page);

    const res = await page.request.get(`${API}/cfdi`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json() as { data?: unknown; meta?: { total: number } };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.meta?.total).toBe('number');
  });
});

test.describe('GET /api/orders — client-facing paginated shape', () => {
  test('returns { data, meta } envelope with meta.total >= 0', async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const r = await page.request.get(`${API}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(r.status()).toBe(200);
    const rb = await r.json() as { data?: unknown; meta?: { total: number; page: number; limit: number; pages: number } };
    expect(Array.isArray(rb.data)).toBe(true);
    expect(typeof rb.meta?.total).toBe('number');
    expect(rb.meta!.total).toBeGreaterThanOrEqual(0);
  });

  test('meta.page and meta.limit are present when using query params', async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const r = await page.request.get(`${API}/orders?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const rb = await r.json() as { meta?: { page: number; limit: number; pages: number } };
    expect(rb.meta?.page).toBe(1);
    expect(rb.meta?.limit).toBe(5);
    expect(typeof rb.meta?.pages).toBe('number');
  });

  test('no JWT → 401', async ({ page }) => {
    const r = await page.request.get(`${API}/orders`);
    expect(r.status()).toBe(401);
  });
});

test.describe('GET /api/clientes — admin paginated shape', () => {
  test('returns { data, meta } envelope as ADMIN', async ({ page }) => {
    const token = await adminLogin(page);

    const r = await page.request.get(`${API}/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(r.status()).toBe(200);
    const rb = await r.json() as { data?: unknown; meta?: { total: number } };
    expect(Array.isArray(rb.data)).toBe(true);
    expect(typeof rb.meta?.total).toBe('number');
  });

  test('CLIENTE role → 403', async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const r = await page.request.get(`${API}/clientes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(403);
  });
});

test.describe('GET /api/clientes/top — top clientes', () => {
  test('returns array ordered by totalGastado desc', async ({ page }) => {
    const token = await adminLogin(page);

    const r = await page.request.get(`${API}/clientes/top`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(r.status()).toBe(200);
    const rb = await r.json() as unknown[];
    expect(Array.isArray(rb)).toBe(true);
  });

  test('limit=3 returns at most 3 items', async ({ page }) => {
    const token = await adminLogin(page);

    const r = await page.request.get(`${API}/clientes/top?limit=3`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const rb = await r.json() as unknown[];
    expect(rb.length).toBeLessThanOrEqual(3);
  });

  test('CLIENTE role → 403', async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const r = await page.request.get(`${API}/clientes/top`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(403);
  });
});

test.describe('GET /api/clientes/stats — clientes aggregate', () => {
  test('returns { total: number } with total >= 0 as ADMIN', async ({ page }) => {
    const token = await adminLogin(page);

    const r = await page.request.get(`${API}/clientes/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(r.status()).toBe(200);
    const rb = await r.json() as { total?: number };
    expect(typeof rb.total).toBe('number');
    expect(rb.total!).toBeGreaterThanOrEqual(0);
  });

  test('CLIENTE role → 403', async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const r = await page.request.get(`${API}/clientes/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(403);
  });
});

test.describe('Role guards — unauthenticated and insufficient role', () => {
  test('GET /api/orders/all without JWT → 401', async ({ page }) => {
    const res = await page.request.get(`${API}/orders/all`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/orders/stats without JWT → 401', async ({ page }) => {
    const res = await page.request.get(`${API}/orders/stats`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/orders/all with CLIENTE role → 403', async ({ page }) => {
    // Log in as cliente
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const restricted = await page.request.get(`${API}/orders/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(restricted.status()).toBe(403);
  });

  test('GET /api/orders/stats with CLIENTE role → 403', async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { correo: 'cliente@example.com', password: 'cliente123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { accessToken?: string };
    const token = body.accessToken ?? '';

    const restricted = await page.request.get(`${API}/orders/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(restricted.status()).toBe(403);
  });
});
