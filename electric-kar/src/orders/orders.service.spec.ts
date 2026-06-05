import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCupon, EstadoProducto, Prisma, TipoCupon } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

/** Producto de prueba con valores por defecto sobreescribibles. */
function producto(overrides: Partial<any> = {}) {
  return {
    id: 'prod-1',
    nombre: 'Batería 12V',
    precio: new Prisma.Decimal(100),
    tasaIva: 16,
    estado: EstadoProducto.PUBLICADO,
    seguirInventario: true,
    permitirSinStock: false,
    existencias: 10,
    ...overrides,
  };
}

function item(prod: any, cantidad = 1) {
  return { productoId: prod.id, cantidad, producto: prod };
}

/**
 * Construye un cliente Prisma simulado cuyo `$transaction(cb)` ejecuta el
 * callback con un `tx` controlado por la prueba.
 */
function buildPrismaMock(tx: any) {
  return {
    $transaction: jest.fn(async (cb: any) => cb(tx)),
    pedido: { findUnique: jest.fn(), update: jest.fn() },
  };
}

function buildTx(overrides: Partial<any> = {}) {
  return {
    carrito: { findUnique: jest.fn() },
    cupon: { findUnique: jest.fn(), update: jest.fn() },
    pedido: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    producto: { update: jest.fn() },
    carritoItem: { deleteMany: jest.fn() },
    cliente: { update: jest.fn() },
    ...overrides,
  };
}

async function makeService(prisma: any): Promise<OrdersService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return moduleRef.get(OrdersService);
}

describe('OrdersService', () => {
  describe('checkout', () => {
    it('rechaza un carrito vacío', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue({ id: 'c1', items: [] });
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza si no existe carrito', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue(null);
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza productos no publicados', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue({
        id: 'c1',
        items: [item(producto({ estado: EstadoProducto.BORRADOR }))],
      });
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1')).rejects.toThrow(/no está disponible/);
    });

    it('rechaza cuando el stock es insuficiente', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue({
        id: 'c1',
        items: [item(producto({ existencias: 1 }), 5)],
      });
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1')).rejects.toThrow(/Stock insuficiente/);
    });

    it('permite vender sin stock cuando permitirSinStock=true', async () => {
      const tx = buildTx();
      const prod = producto({ existencias: 0, permitirSinStock: true });
      tx.carrito.findUnique.mockResolvedValue({ id: 'c1', items: [item(prod, 3)] });
      tx.pedido.create.mockResolvedValue({ id: 'ped-1' });
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1')).resolves.toEqual({ id: 'ped-1' });
    });

    it('calcula subtotal, IVA incluido y total; genera folio y descuenta stock', async () => {
      const tx = buildTx();
      const a = producto({ id: 'A', precio: new Prisma.Decimal(100) }); // 2u
      const b = producto({ id: 'B', precio: new Prisma.Decimal(50) }); // 1u
      tx.carrito.findUnique.mockResolvedValue({
        id: 'c1',
        items: [item(a, 2), item(b, 1)],
      });
      tx.pedido.count.mockResolvedValue(5); // -> EK-204820
      tx.pedido.create.mockResolvedValue({ id: 'ped-1' });
      const service = await makeService(buildPrismaMock(tx));

      await service.checkout('cli-1');

      const data = tx.pedido.create.mock.calls[0][0].data;
      expect(data.subtotal.toString()).toBe('250'); // 100*2 + 50*1
      // IVA contenido: (200 + 50) * 16 / 116 = 34.48 (2 decimales)
      expect(data.iva.toString()).toBe('34.48');
      expect(data.total.toString()).toBe('250');
      expect(data.descuento.toString()).toBe('0');
      expect(data.folio).toBe('EK-204820');

      // Inventario descontado para cada producto con seguimiento
      expect(tx.producto.update).toHaveBeenCalledTimes(2);
      // Carrito vaciado y cliente actualizado
      expect(tx.carritoItem.deleteMany).toHaveBeenCalledWith({
        where: { carritoId: 'c1' },
      });
      expect(tx.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cli-1' } }),
      );
    });

    it('no descuenta inventario de productos sin seguimiento', async () => {
      const tx = buildTx();
      const prod = producto({ seguirInventario: false });
      tx.carrito.findUnique.mockResolvedValue({ id: 'c1', items: [item(prod, 1)] });
      tx.pedido.create.mockResolvedValue({ id: 'ped-1' });
      const service = await makeService(buildPrismaMock(tx));

      await service.checkout('cli-1');

      expect(tx.producto.update).not.toHaveBeenCalled();
    });

    it('aplica un cupón de porcentaje e incrementa sus usos', async () => {
      const tx = buildTx();
      const prod = producto({ precio: new Prisma.Decimal(100) });
      tx.carrito.findUnique.mockResolvedValue({ id: 'c1', items: [item(prod, 2)] }); // 200
      tx.cupon.findUnique.mockResolvedValue({
        id: 'cup-1',
        codigo: 'DEMO10',
        tipo: TipoCupon.PORCENTAJE,
        valor: new Prisma.Decimal(10),
        estado: EstadoCupon.ACTIVO,
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2999-01-01'),
        limiteTotal: null,
        usos: 0,
        compraMinima: new Prisma.Decimal(0),
      });
      tx.pedido.create.mockResolvedValue({ id: 'ped-1' });
      const service = await makeService(buildPrismaMock(tx));

      await service.checkout('cli-1', 'DEMO10');

      const data = tx.pedido.create.mock.calls[0][0].data;
      expect(data.descuento.toString()).toBe('20'); // 10% de 200
      expect(data.total.toString()).toBe('180'); // 200 - 20
      expect(data.cuponId).toBe('cup-1');
      expect(tx.cupon.update).toHaveBeenCalledWith({
        where: { id: 'cup-1' },
        data: { usos: { increment: 1 } },
      });
    });

    it('rechaza un cupón expirado', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue({
        id: 'c1',
        items: [item(producto(), 1)],
      });
      tx.cupon.findUnique.mockResolvedValue({
        id: 'cup-1',
        tipo: TipoCupon.PORCENTAJE,
        valor: new Prisma.Decimal(10),
        estado: EstadoCupon.EXPIRADO,
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2020-02-01'),
        limiteTotal: null,
        usos: 0,
        compraMinima: new Prisma.Decimal(0),
      });
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1', 'VIEJO')).rejects.toThrow(/expirado/);
    });

    it('rechaza un cupón inexistente', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue({
        id: 'c1',
        items: [item(producto(), 1)],
      });
      tx.cupon.findUnique.mockResolvedValue(null);
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1', 'NOPE')).rejects.toThrow(
        /no encontrado/,
      );
    });

    it('rechaza si no se alcanza la compra mínima del cupón', async () => {
      const tx = buildTx();
      tx.carrito.findUnique.mockResolvedValue({
        id: 'c1',
        items: [item(producto({ precio: new Prisma.Decimal(50) }), 1)], // 50
      });
      tx.cupon.findUnique.mockResolvedValue({
        id: 'cup-1',
        tipo: TipoCupon.PORCENTAJE,
        valor: new Prisma.Decimal(10),
        estado: EstadoCupon.ACTIVO,
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2999-01-01'),
        limiteTotal: null,
        usos: 0,
        compraMinima: new Prisma.Decimal(500),
      });
      const service = await makeService(buildPrismaMock(tx));

      await expect(service.checkout('cli-1', 'DEMO10')).rejects.toThrow(
        /compra mínima/,
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFound cuando el pedido no existe', async () => {
      const prisma = buildPrismaMock(buildTx());
      prisma.pedido.findUnique.mockResolvedValue(null);
      const service = await makeService(prisma);

      await expect(
        service.findOne('x', { id: 'cli-1', correo: 'a@b.c', tipo: 'cliente' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('impide que un cliente vea el pedido de otro', async () => {
      const prisma = buildPrismaMock(buildTx());
      prisma.pedido.findUnique.mockResolvedValue({ id: 'p1', clienteId: 'otro' });
      const service = await makeService(prisma);

      await expect(
        service.findOne('p1', { id: 'cli-1', correo: 'a@b.c', tipo: 'cliente' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('permite al dueño ver su propio pedido', async () => {
      const prisma = buildPrismaMock(buildTx());
      const pedido = { id: 'p1', clienteId: 'cli-1' };
      prisma.pedido.findUnique.mockResolvedValue(pedido);
      const service = await makeService(prisma);

      await expect(
        service.findOne('p1', { id: 'cli-1', correo: 'a@b.c', tipo: 'cliente' }),
      ).resolves.toEqual(pedido);
    });

    it('permite al personal ver cualquier pedido', async () => {
      const prisma = buildPrismaMock(buildTx());
      const pedido = { id: 'p1', clienteId: 'cli-1' };
      prisma.pedido.findUnique.mockResolvedValue(pedido);
      const service = await makeService(prisma);

      await expect(
        service.findOne('p1', { id: 'u-1', correo: 'a@b.c', tipo: 'usuario' }),
      ).resolves.toEqual(pedido);
    });
  });
});
