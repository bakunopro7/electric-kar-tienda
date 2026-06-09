import { test, expect } from '@playwright/test';

/**
 * SSR + hydration coverage. Automates what was previously the manual T-19
 * verification step of the SSR migration:
 *  - the server returns meaningful, pre-rendered HTML (not an empty app-root)
 *  - the cookie-based theme is applied server-side (no flash of wrong theme)
 *  - the client hydrates without NG0500 / hydration-mismatch errors
 */

test.describe('SSR rendering', () => {
  test('home returns populated server-rendered HTML', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const html = await res.text();

    // The SSR output must contain real content, not an empty shell.
    expect(html).not.toContain('<app-root></app-root>');
    expect(html.length).toBeGreaterThan(10_000);
  });

  test('dark theme cookie renders class="dark" on <html> server-side', async ({
    request,
  }) => {
    const res = await request.get('/', {
      headers: { cookie: 'ek_theme=dark' },
    });
    const html = await res.text();
    const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? '';
    expect(htmlTag).toMatch(/class="[^"]*\bdark\b[^"]*"/);
  });

  test('no theme cookie renders light (absence of dark class) server-side', async ({
    request,
  }) => {
    const res = await request.get('/');
    const html = await res.text();
    const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? '';
    expect(htmlTag).not.toMatch(/\bdark\b/);
  });
});

test.describe('Hydration', () => {
  test('home hydrates with no NG0500 / hydration-mismatch errors', async ({
    page,
  }) => {
    const ngErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (/NG0500|NG0501|NG0502|hydration/i.test(text)) ngErrors.push(text);
    });
    page.on('pageerror', (err) => {
      if (/NG0500|NG0501|NG0502|hydration/i.test(err.message)) {
        ngErrors.push(err.message);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    // Give Angular a beat to finish bootstrapping/hydrating after networkidle.
    await page.waitForTimeout(1000);

    expect(ngErrors, ngErrors.join('\n')).toHaveLength(0);
  });
});
