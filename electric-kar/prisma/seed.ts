import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // --- Usuario del panel (Super admin) -------------------------------------
  const adminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@electrick-kar.mx' },
    update: {},
    create: {
      nombre: 'Super Admin',
      correo: 'admin@electrick-kar.mx',
      password: adminPass,
      rol: 'SUPER',
    },
  });

  // --- Cliente de ejemplo (tienda) -----------------------------------------
  const clientePass = await bcrypt.hash('cliente123', 10);
  const cliente = await prisma.cliente.upsert({
    where: { correo: 'cliente@example.com' },
    update: {},
    create: {
      nombre: 'Juan Pérez',
      correo: 'cliente@example.com',
      password: clientePass,
      telefono: '55 1234 5678',
    },
  });

  // --- Categoría + Marca ----------------------------------------------------
  const categoria = await prisma.categoria.upsert({
    where: { slug: 'baterias' },
    update: {},
    create: {
      nombre: 'Baterías',
      slug: 'baterias',
      descripcion: 'Baterías y acumuladores automotrices',
    },
  });

  const marca = await prisma.marca.upsert({
    where: { slug: 'lth' },
    update: {},
    create: { nombre: 'LTH', slug: 'lth' },
  });

  // --- Productos ------------------------------------------------------------
  const productos = [
    {
      nombre: 'Batería AGM 12V 70Ah Heavy Duty',
      sku: 'BAT-AGM-70',
      precio: 2499.0,
      existencias: 12,
      claveProdSat: '26111702',
    },
    {
      nombre: 'Batería Calcio 12V 45Ah',
      sku: 'BAT-CAL-45',
      precio: 1499.0,
      existencias: 30,
      claveProdSat: '26111702',
    },
  ];

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        ...p,
        estado: 'PUBLICADO',
        categoriaId: categoria.id,
        marcaId: marca.id,
      },
    });
  }

  // --- Menú de navegación por defecto --------------------------------------
  if ((await prisma.menuItem.count()) === 0) {
    await prisma.menuItem.createMany({
      data: [
        { label: 'Inicio', url: '/', orden: 1 },
        { label: 'Catálogo', url: '/tienda', orden: 2 },
        { label: 'Destacados', url: '/destacados', orden: 3 },
        { label: 'Blog', url: '/blog', orden: 4 },
        { label: 'Nosotros', url: '/nosotros', orden: 5 },
        { label: 'Contacto', url: '/contacto', orden: 6 },
      ],
    });
  }

  console.log('Seed completado:');
  console.log(`  Panel : ${admin.correo} / admin123`);
  console.log(`  Tienda: ${cliente.correo} / cliente123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
