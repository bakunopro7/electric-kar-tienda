import { Injectable, PLATFORM_ID, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Producto } from './models';

const KEY = 'ek_favs';

/**
 * Local favorites (signals + localStorage).
 * SSR-safe: localStorage is only accessed after the first browser render.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly items = signal<Producto[]>([]); // safe default on server
  readonly count = computed(() => this.items().length);

  constructor() {
    // Browser-only: hydrate from storage AFTER first render, then keep in sync.
    if (this.isBrowser) {
      afterNextRender(() => {
        this.items.set(this.load());
        effect(() => localStorage.setItem(KEY, JSON.stringify(this.items())));
      });
    }
  }

  has(id: string) {
    return this.items().some((p) => p.id === id);
  }

  toggle(producto: Producto) {
    this.items.update((items) =>
      items.some((p) => p.id === producto.id)
        ? items.filter((p) => p.id !== producto.id)
        : [...items, producto],
    );
  }

  remove(id: string) {
    this.items.update((items) => items.filter((p) => p.id !== id));
  }

  private load(): Producto[] {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Producto[]) : [];
  }
}
