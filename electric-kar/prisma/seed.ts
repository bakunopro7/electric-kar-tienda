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

  // --- Catálogo genérico (estatus / presentación) --------------------------
  await prisma.catalogo.createMany({
    skipDuplicates: true,
    data: [
      { tipo: 'ESTADO_PEDIDO', clave: 'NUEVO', etiqueta: 'Nuevo', color: '#2f74ff', orden: 1 },
      { tipo: 'ESTADO_PEDIDO', clave: 'PREPARACION', etiqueta: 'En preparación', color: '#f5b81a', orden: 2 },
      { tipo: 'ESTADO_PEDIDO', clave: 'ENVIADO', etiqueta: 'Enviado', color: '#0f4bd1', orden: 3 },
      { tipo: 'ESTADO_PEDIDO', clave: 'ENTREGADO', etiqueta: 'Entregado', color: '#16a36a', orden: 4 },
      { tipo: 'ESTADO_PEDIDO', clave: 'CANCELADO', etiqueta: 'Cancelado', color: '#e23b4e', orden: 5 },
      { tipo: 'ESTADO_CFDI', clave: 'POR_TIMBRAR', etiqueta: 'Por timbrar', color: '#f5b81a', orden: 1 },
      { tipo: 'ESTADO_CFDI', clave: 'TIMBRADA', etiqueta: 'Timbrada', color: '#16a36a', orden: 2 },
      { tipo: 'ESTADO_CFDI', clave: 'CANCELADA', etiqueta: 'Cancelada', color: '#e23b4e', orden: 3 },
      { tipo: 'ESTADO_CUPON', clave: 'ACTIVO', etiqueta: 'Activo', color: '#16a36a', orden: 1 },
      { tipo: 'ESTADO_CUPON', clave: 'PROGRAMADO', etiqueta: 'Programado', color: '#2f74ff', orden: 2 },
      { tipo: 'ESTADO_CUPON', clave: 'POR_EXPIRAR', etiqueta: 'Por expirar', color: '#f5b81a', orden: 3 },
      { tipo: 'ESTADO_CUPON', clave: 'EXPIRADO', etiqueta: 'Expirado', color: '#e23b4e', orden: 4 },
      { tipo: 'SEGMENTO_CLIENTE', clave: 'NUEVO', etiqueta: 'Nuevo', color: '#2f74ff', orden: 1 },
      { tipo: 'SEGMENTO_CLIENTE', clave: 'FRECUENTE', etiqueta: 'Frecuente', color: '#16a36a', orden: 2 },
      { tipo: 'SEGMENTO_CLIENTE', clave: 'MAYOREO', etiqueta: 'Mayoreo', color: '#f5b81a', orden: 3 },
    ],
  });

  // --- Catálogos SAT (CFDI 4.0) --------------------------------------------
  await prisma.catalogoSat.createMany({
    skipDuplicates: true,
    data: [
      { tipo: 'REGIMEN_FISCAL', clave: '601', descripcion: 'General de Ley Personas Morales' },
      { tipo: 'REGIMEN_FISCAL', clave: '612', descripcion: 'PF con Actividades Empresariales y Profesionales' },
      { tipo: 'REGIMEN_FISCAL', clave: '626', descripcion: 'Régimen Simplificado de Confianza (RESICO)' },
      { tipo: 'REGIMEN_FISCAL', clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados' },
      { tipo: 'REGIMEN_FISCAL', clave: '616', descripcion: 'Sin obligaciones fiscales' },
      { tipo: 'USO_CFDI', clave: 'G01', descripcion: 'Adquisición de mercancías' },
      { tipo: 'USO_CFDI', clave: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
      { tipo: 'USO_CFDI', clave: 'G03', descripcion: 'Gastos en general' },
      { tipo: 'USO_CFDI', clave: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
      { tipo: 'USO_CFDI', clave: 'I08', descripcion: 'Otra maquinaria y equipo' },
      { tipo: 'USO_CFDI', clave: 'S01', descripcion: 'Sin efectos fiscales' },
      { tipo: 'FORMA_PAGO', clave: '01', descripcion: 'Efectivo' },
      { tipo: 'FORMA_PAGO', clave: '03', descripcion: 'Transferencia electrónica de fondos' },
      { tipo: 'FORMA_PAGO', clave: '04', descripcion: 'Tarjeta de crédito' },
      { tipo: 'FORMA_PAGO', clave: '28', descripcion: 'Tarjeta de débito' },
      { tipo: 'FORMA_PAGO', clave: '99', descripcion: 'Por definir' },
      { tipo: 'METODO_PAGO', clave: 'PUE', descripcion: 'Pago en una sola exhibición' },
      { tipo: 'METODO_PAGO', clave: 'PPD', descripcion: 'Pago en parcialidades o diferido' },
      { tipo: 'CLAVE_UNIDAD', clave: 'H87', descripcion: 'Pieza' },
      { tipo: 'CLAVE_UNIDAD', clave: 'E48', descripcion: 'Unidad de servicio' },
      { tipo: 'CLAVE_UNIDAD', clave: 'KGM', descripcion: 'Kilogramo' },
      { tipo: 'CLAVE_PROD_SERV', clave: '26111702', descripcion: 'Baterías para automóvil' },
      { tipo: 'CLAVE_PROD_SERV', clave: '39111610', descripcion: 'Lámparas LED' },
    ],
  });

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
