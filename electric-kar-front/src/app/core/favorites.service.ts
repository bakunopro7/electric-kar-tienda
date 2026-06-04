import { Injectable, computed, effect, signal } from '@angular/core';
import { Producto } from './models';

const KEY = 'ek_favs';

/** Favoritos locales (signals + localStorage). */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly items = signal<Producto[]>(this.load());
  readonly count = computed(() => this.items().length);

  constructor() {
    effect(() => localStorage.setItem(KEY, JSON.stringify(this.items())));
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
