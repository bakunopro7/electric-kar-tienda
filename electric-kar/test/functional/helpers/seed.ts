import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../src/prisma/prisma.service';

export const CLIENTE_PASSWORD = 'cliente123';
export const STAFF_PASSWORD = 'admin123';

/** Minimal baseline — NOT the full prisma/seed.ts. */
export async function seedBaseline(prisma: PrismaService) {
  // Hash with the same SALT_ROUNDS (10) auth.service uses so bcrypt.compare passes.
  const clientePass = await bcrypt.hash(CLIENTE_PASSWORD, 10);
  const staffPass = await bcrypt.hash(STAFF_PASSWORD, 10);

  const cliente = await prisma.cliente.create({
    data: { nombre: 'Test Cliente', correo: 'cliente@test.mx', password: clientePass },
  });
  const staff = await prisma.usuario.create({
    data: { nombre: 'Test Admin', correo: 'admin@test.mx', password: staffPass, rol: 'ADMIN' },
  });
  const categoria = await prisma.categoria.create({
    data: { nombre: 'Test Cat', slug: 'test-cat' },
  });
  const marca = await prisma.marca.create({
    data: { nombre: 'Test Marca', slug: 'test-marca' },
  });
  const productos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Prod A',
        sku: 'TST-A',
        precio: 100,
        existencias: 10,
        estado: 'PUBLICADO',
        categoriaId: categoria.id,
        marcaId: marca.id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Prod B',
        sku: 'TST-B',
        precio: 200,
        existencias: 5,
        estado: 'PUBLICADO',
        categoriaId: categoria.id,
        marcaId: marca.id,
      },
    }),
  ]);
  return { cliente, staff, categoria, marca, productos };
}
