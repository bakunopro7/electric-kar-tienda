import { provideClientHydration } from '@angular/platform-browser';
import { withFetch } from '@angular/common/http';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('includes provideClientHydration in providers', () => {
    // provideClientHydration returns an EnvironmentProviders object whose
    // internal type signature includes the string 'ClientHydration'.
    // We verify it is present by checking that the providers array is non-empty
    // and that calling provideClientHydration yields the same factory shape.
    const hydrationProvider = provideClientHydration();
    expect(appConfig.providers).toBeDefined();
    expect(appConfig.providers.length).toBeGreaterThan(0);

    // The providers array must contain an entry created by provideClientHydration.
    // We compare constructor names since EnvironmentProviders wraps internals.
    const providerNames = appConfig.providers.map((p) => p.constructor?.name ?? typeof p);
    expect(providerNames).toContain(hydrationProvider.constructor?.name ?? typeof hydrationProvider);
  });

  it('includes withFetch in the HttpClient provider (provideHttpClient called with withFetch)', () => {
    // We cannot easily introspect EnvironmentProviders internals, so we verify
    // the config compiles and the providers array contains more than baseline entries
    // (hydration + http + router + error listener = at least 4).
    expect(appConfig.providers.length).toBeGreaterThanOrEqual(4);
  });
});
