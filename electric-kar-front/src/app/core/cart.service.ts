import { Injectable, PLATFORM_ID, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem, Producto } from './models';

const CART_KEY = 'ek_cart';

/**
 * Local cart (signals + localStorage). Works without login; can sync to server at checkout.
 * SSR-safe: localStorage is only accessed after the first browser render.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly items = signal<CartItem[]>([]); // safe default on server

  readonly count = computed(() =>
    this.items().reduce((acc, it) => acc + it.cantidad, 0),
  );

  readonly total = computed(() =>
    this.items().reduce((acc, it) => acc + Number(it.producto.precio) * it.cantidad, 0),
  );

  constructor() {
    // Browser-only: hydrate from storage AFTER first render, then keep in sync.
    if (this.isBrowser) {
      afterNextRender(() => {
        this.items.set(this.load());
        effect(() => localStorage.setItem(CART_KEY, JSON.stringify(this.items())));
      });
    }
  }

  add(producto: Producto, cantidad = 1) {
    this.items.update((items) => {
      const existing = items.find((it) => it.producto.id === producto.id);
      if (existing) {
        return items.map((it) =>
          it.producto.id === producto.id
            ? { ...it, cantidad: it.cantidad + cantidad }
            : it,
        );
      }
      return [...items, { producto, cantidad }];
    });
  }

  setQty(productoId: string, cantidad: number) {
    if (cantidad <= 0) return this.remove(productoId);
    this.items.update((items) =>
      items.map((it) =>
        it.producto.id === productoId ? { ...it, cantidad } : it,
      ),
    );
  }

  remove(productoId: string) {
    this.items.update((items) =>
      items.filter((it) => it.producto.id !== productoId),
    );
  }

  clear() {
    this.items.set([]);
  }

  private load(): CartItem[] {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  }
}
