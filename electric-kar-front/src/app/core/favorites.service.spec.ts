import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { FavoritesService } from './favorites.service';

describe('FavoritesService (SSR guard)', () => {
  it('constructs without error when platform is server', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    expect(() => TestBed.inject(FavoritesService)).not.toThrow();
  });

  it('has empty items when platform is server', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(FavoritesService);
    expect(service.items()).toEqual([]);
  });
});
