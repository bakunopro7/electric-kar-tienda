import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, Producto } from './models';

const CART_KEY = 'ek_cart';

/**
 * Carrito local (signals + localStorage). Funciona sin login; al hacer
 * checkout se podrá sincronizar con el carrito del servidor (`/cart`).
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(this.load());

  readonly count = computed(() =>
    this.items().reduce((acc, it) => acc + it.cantidad, 0),
  );

  readonly total = computed(() =>
    this.items().reduce((acc, it) => acc + Number(it.producto.precio) * it.cantidad, 0),
  );

  constructor() {
    effect(() => localStorage.setItem(CART_KEY, JSON.stringify(this.items())));
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
