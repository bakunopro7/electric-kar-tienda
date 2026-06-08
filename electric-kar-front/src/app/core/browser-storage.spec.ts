import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { injectIsBrowser, safeLocalGet, safeLocalSet } from './browser-storage';

describe('browser-storage helpers', () => {
  describe('injectIsBrowser', () => {
    it('returns false when platform is server', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const result = TestBed.runInInjectionContext(() => injectIsBrowser());
      expect(result).toBe(false);
    });

    it('returns true when platform is browser', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
      const result = TestBed.runInInjectionContext(() => injectIsBrowser());
      expect(result).toBe(true);
    });
  });

  describe('safeLocalGet', () => {
    it('returns null when localStorage throws', () => {
      const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('no storage'); },
        configurable: true,
      });
      expect(safeLocalGet('any')).toBeNull();
      if (original) Object.defineProperty(window, 'localStorage', original);
    });
  });

  describe('safeLocalSet', () => {
    it('does not throw when localStorage throws', () => {
      const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('no storage'); },
        configurable: true,
      });
      expect(() => safeLocalSet('key', 'value')).not.toThrow();
      if (original) Object.defineProperty(window, 'localStorage', original);
    });
  });
});
