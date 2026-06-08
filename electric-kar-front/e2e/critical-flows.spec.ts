import { test, expect, Page } from '@playwright/test';

/**
 * Critical storefront flows: login, add-to-cart, and checkout up to the Stripe
 * redirect boundary. Requires the backend (:3000) running with seed data.
 *
 * Seed credentials (see CLAUDE.local.md): cliente@example.com / cliente123.
 *
 * NOTE on checkout: the app redirects to Stripe Checkout (an external domain)
 * at checkout.component.ts. We never complete a real payment — the test mocks
 * the backend checkout response and asserts the browser navigates toward
 * checkout.stripe.com, which is the contract boundary.
 */

const CLIENTE = { correo: 'cliente@example.com', password: 'cliente123' };

async function login(page: Page): Promise<void> {
  await page.goto('/acceso');
  await page.fill('input[name="correo"]', CLIENTE.correo);
  await page.fill('input[name="password"]', CLIENTE.password);
  await page.click('button[type="submit"]:has-text("Iniciar sesión")');
  // Auth success is reflected by a token in localStorage.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('ek_token')))
    .not.toBeNull();
}

test('cliente can log in with seed credentials', async ({ page }) => {
  await login(page);
  // Header swaps the access link for a logout button once authenticated.
  await expect(page.locator('button:has-text("Salir")')).toBeVisible();
});

test('adding a product updates the cart badge', async ({ page }) => {
  await page.goto('/tienda');
  const addButton = page
    .locator('button:has-text("Añadir al carrito")')
    .first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  const badge = page.locator('a[aria-label="Carrito"] span');
  await expect(badge).toHaveText('1');
});

test('checkout redirects toward Stripe (boundary, no real payment)', async ({
  page,
}) => {
  await login(page);

  // Put one item in the cart.
  await page.goto('/tienda');
  await page.locator('button:has-text("Añadir al carrito")').first().click();
  await expect(page.locator('a[aria-label="Carrito"] span')).toHaveText('1');

  // The cart persists to localStorage via an async effect; wait for the write
  // to land before a full navigation so /checkout rehydrates a non-empty cart.
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('ek_cart') ?? '[]').length,
      ),
    )
    .toBeGreaterThan(0);

  // Mock the backend checkout call to deterministically return a Stripe URL,
  // and stub the Stripe page itself so navigation stays offline.
  await page.route('**/payments/checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://checkout.stripe.com/c/pay/test_e2e_session',
      }),
    });
  });
  await page.route('https://checkout.stripe.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Stripe Checkout (stub)</body></html>',
    });
  });

  await page.goto('/checkout');
  await page.fill('input[placeholder="Nombre completo"]', 'Cliente Demo');
  await page.fill('input[placeholder="Correo"]', CLIENTE.correo);
  await page.fill('input[placeholder="Teléfono"]', '5512345678');
  await page.fill('input[placeholder="Calle y número"]', 'Av. Siempre Viva 742');
  await page.fill('input[placeholder="Colonia"]', 'Centro');
  await page.fill('input[placeholder="C.P."]', '06000');
  await page.fill('input[placeholder="Ciudad"]', 'CDMX');
  await page.fill('input[placeholder="Estado"]', 'CDMX');

  await page.click('button:has-text("Pagar")');

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
  expect(page.url()).toContain('checkout.stripe.com');
});
