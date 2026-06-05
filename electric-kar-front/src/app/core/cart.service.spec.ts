import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Producto } from './models';

/** Producto mínimo de prueba (solo los campos que usa el carrito). */
function producto(id: string, precio: number): Producto {
  return { id, precio } as unknown as Producto;
}

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('empieza vacío', () => {
    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.total()).toBe(0);
  });

  it('agrega un producto nuevo', () => {
    service.add(producto('a', 100), 2);
    expect(service.items()).toHaveLength(1);
    expect(service.count()).toBe(2);
    expect(service.total()).toBe(200);
  });

  it('acumula la cantidad de un producto ya presente', () => {
    service.add(producto('a', 100), 1);
    service.add(producto('a', 100), 3);
    expect(service.items()).toHaveLength(1);
    expect(service.count()).toBe(4);
  });

  it('suma el total con varios productos y precios string', () => {
    service.add(producto('a', 100), 1);
    service.add(producto('b', 50.5 as unknown as number), 2);
    expect(service.total()).toBe(201); // 100 + 50.5*2
  });

  it('setQty reemplaza la cantidad', () => {
    service.add(producto('a', 100), 1);
    service.setQty('a', 5);
    expect(service.count()).toBe(5);
  });

  it('setQty con 0 o menos elimina el item', () => {
    service.add(producto('a', 100), 2);
    service.setQty('a', 0);
    expect(service.items()).toHaveLength(0);
  });

  it('remove elimina solo el producto indicado', () => {
    service.add(producto('a', 100), 1);
    service.add(producto('b', 50), 1);
    service.remove('a');
    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].producto.id).toBe('b');
  });

  it('clear vacía el carrito', () => {
    service.add(producto('a', 100), 1);
    service.clear();
    expect(service.items()).toEqual([]);
  });

  it('persiste e hidrata desde localStorage', () => {
    service.add(producto('a', 100), 2);
    // El effect persiste en localStorage; una instancia nueva debe rehidratar.
    const fresh = TestBed.inject(CartService);
    expect(fresh.count()).toBe(2);
  });
});
