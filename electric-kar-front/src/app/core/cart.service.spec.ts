import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { CartService } from './cart.service';

describe('CartService (SSR guard)', () => {
  it('constructs without error when platform is server', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    expect(() => TestBed.inject(CartService)).not.toThrow();
  });

  it('has empty items when platform is server', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(CartService);
    expect(service.items()).toEqual([]);
  });
});
