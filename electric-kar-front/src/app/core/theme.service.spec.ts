import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ThemeService } from './theme.service';

function makeRequest(cookieHeader: string): Request {
  return new Request('http://localhost/', {
    headers: { cookie: cookieHeader },
  });
}

describe('ThemeService (SSR + cookie-driven)', () => {
  describe('server-side seeding via REQUEST token', () => {
    it('seeds isDark=true when REQUEST has ek_theme=dark cookie', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: makeRequest('ek_theme=dark') },
        ],
      });
      const service = TestBed.inject(ThemeService);
      expect(service.isDark()).toBe(true);
    });

    it('seeds isDark=false when REQUEST has ek_theme=light cookie', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: makeRequest('ek_theme=light') },
        ],
      });
      const service = TestBed.inject(ThemeService);
      expect(service.isDark()).toBe(false);
    });

    it('seeds isDark=false when REQUEST has no ek_theme cookie', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: makeRequest('') },
        ],
      });
      const service = TestBed.inject(ThemeService);
      expect(service.isDark()).toBe(false);
    });

    it('constructs without error when REQUEST is null (no cookie)', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: null },
        ],
      });
      expect(() => TestBed.inject(ThemeService)).not.toThrow();
    });

    it('applies dark class to <html> during server render when cookie is dark', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: REQUEST, useValue: makeRequest('ek_theme=dark') },
        ],
      });
      const service = TestBed.inject(ThemeService);
      const doc = TestBed.inject(DOCUMENT);
      // effect runs synchronously in tests
      TestBed.flushEffects();
      expect(doc.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('client-side toggle', () => {
    it('toggle() flips isDark value', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: REQUEST, useValue: null },
        ],
      });
      const service = TestBed.inject(ThemeService);
      const initial = service.isDark();
      service.toggle();
      expect(service.isDark()).toBe(!initial);
    });
  });
});
