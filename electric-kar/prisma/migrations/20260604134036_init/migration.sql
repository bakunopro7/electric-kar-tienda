-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER', 'ADMIN', 'VENDEDOR', 'CONTADOR');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INVITADO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "SegmentoCliente" AS ENUM ('NUEVO', 'FRECUENTE', 'MAYOREO');

-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('PUBLICADO', 'BORRADOR', 'PROGRAMADO');

-- CreateEnum
CREATE TYPE "ClaseEnvio" AS ENUM ('ESTANDAR', 'VOLUMINOSO', 'FRAGIL');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('NUEVO', 'PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoEntrega" AS ENUM ('ENVIO', 'PICKUP');

-- CreateEnum
CREATE TYPE "TipoCupon" AS ENUM ('PORCENTAJE', 'MONTO_FIJO', 'ENVIO_GRATIS');

-- CreateEnum
CREATE TYPE "AplicaCupon" AS ENUM ('TIENDA', 'CATEGORIAS', 'PRODUCTOS');

-- CreateEnum
CREATE TYPE "EstadoCupon" AS ENUM ('ACTIVO', 'PROGRAMADO', 'POR_EXPIRAR', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('I', 'E', 'P');

-- CreateEnum
CREATE TYPE "MetodoPagoSat" AS ENUM ('PUE', 'PPD');

-- CreateEnum
CREATE TYPE "EstadoCfdi" AS ENUM ('TIMBRADA', 'POR_TIMBRAR', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MotivoCancelacion" AS ENUM ('M01', 'M02', 'M03', 'M04');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('CREAR', 'EDITAR', 'ELIMINAR', 'ACCESO', 'FISCAL');

-- CreateEnum
CREATE TYPE "TipoIntegracion" AS ENUM ('PASARELA', 'PAC', 'PAQUETERIA');

-- CreateEnum
CREATE TYPE "ModoIntegracion" AS ENUM ('PRUEBAS', 'PRODUCCION');

-- CreateEnum
CREATE TYPE "EstadoIntegracion" AS ENUM ('CONECTADO', 'DESCONECTADO', 'ERROR');

-- CreateEnum
CREATE TYPE "TiempoPreparacion" AS ENUM ('DOS_HORAS', 'MISMO_DIA', 'VEINTICUATRO_HORAS');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'VENDEDOR',
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroActividad" (
    "id" TEXT NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "usuarioId" TEXT,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dispositivo" TEXT,
    "ubicacion" TEXT,
    "ip" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "telefono" TEXT,
    "segmento" "SegmentoCliente" NOT NULL DEFAULT 'NUEVO',
    "rfc" TEXT,
    "pedidosCount" INTEGER NOT NULL DEFAULT 0,
    "totalGastado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Direccion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "interior" TEXT,
    "colonia" TEXT,
    "cp" TEXT NOT NULL,
    "ciudad" TEXT,
    "estado" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Direccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "descripcion" TEXT,
    "descripcionCorta" TEXT,
    "categoriaId" TEXT,
    "marcaId" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "precioComparativo" DECIMAL(12,2),
    "costo" DECIMAL(12,2),
    "tasaIva" INTEGER NOT NULL DEFAULT 16,
    "existencias" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 5,
    "seguirInventario" BOOLEAN NOT NULL DEFAULT true,
    "permitirSinStock" BOOLEAN NOT NULL DEFAULT false,
    "claveProdSat" TEXT,
    "pesoKg" DECIMAL(10,3),
    "claseEnvio" "ClaseEnvio" NOT NULL DEFAULT 'ESTANDAR',
    "estado" "EstadoProducto" NOT NULL DEFAULT 'BORRADOR',
    "etiquetas" TEXT[],
    "imagenes" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrito" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarritoItem" (
    "id" TEXT NOT NULL,
    "carritoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarritoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "folio" TEXT,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'NUEVO',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cuponId" TEXT,
    "envio" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "metodoPagoId" TEXT,
    "metodoEntrega" "MetodoEntrega" NOT NULL DEFAULT 'ENVIO',
    "paqueteria" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoLinea" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PedidoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupon" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCupon" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "compraMinima" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "limiteTotal" INTEGER,
    "limitePorCliente" INTEGER NOT NULL DEFAULT 1,
    "aplicaA" "AplicaCupon" NOT NULL DEFAULT 'TIENDA',
    "soloPrimeraCompra" BOOLEAN NOT NULL DEFAULT false,
    "noAcumulable" BOOLEAN NOT NULL DEFAULT false,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoCupon" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cfdi" (
    "id" TEXT NOT NULL,
    "serieFolio" TEXT,
    "uuidFiscal" TEXT,
    "pedidoId" TEXT NOT NULL,
    "emisorRfc" TEXT NOT NULL,
    "receptorNombre" TEXT NOT NULL,
    "receptorRfc" TEXT NOT NULL,
    "receptorCp" TEXT NOT NULL,
    "receptorRegimen" TEXT NOT NULL,
    "usoCfdi" TEXT NOT NULL,
    "tipoComprobante" "TipoComprobante" NOT NULL DEFAULT 'I',
    "metodoPago" "MetodoPagoSat" NOT NULL DEFAULT 'PUE',
    "formaPago" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoCfdi" NOT NULL DEFAULT 'POR_TIMBRAR',
    "motivoCancelacion" "MotivoCancelacion",
    "uuidSustituye" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cfdi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfdiLinea" (
    "id" TEXT NOT NULL,
    "cfdiId" TEXT NOT NULL,
    "claveProdSat" TEXT NOT NULL,
    "claveUnidadSat" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "CfdiLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplementoPago" (
    "id" TEXT NOT NULL,
    "cfdiId" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "formaPago" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "clabeOrdenante" TEXT,
    "bancoEmisor" TEXT,
    "parcialidad" INTEGER NOT NULL DEFAULT 1,
    "saldoAnterior" DECIMAL(12,2) NOT NULL,
    "saldoInsoluto" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplementoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetodoPago" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "comision" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "proveedorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetodoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigPickup" (
    "id" TEXT NOT NULL,
    "sucursal" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "tiempoPreparacion" "TiempoPreparacion" NOT NULL DEFAULT 'MISMO_DIA',
    "avisoListo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigPickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integracion" (
    "id" TEXT NOT NULL,
    "tipo" "TipoIntegracion" NOT NULL,
    "proveedor" TEXT NOT NULL,
    "modo" "ModoIntegracion" NOT NULL DEFAULT 'PRUEBAS',
    "credenciales" JSONB,
    "webhookUrl" TEXT,
    "estado" "EstadoIntegracion" NOT NULL DEFAULT 'DESCONECTADO',
    "opciones" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "RegistroActividad_usuarioId_idx" ON "RegistroActividad"("usuarioId");

-- CreateIndex
CREATE INDEX "RegistroActividad_fecha_idx" ON "RegistroActividad"("fecha");

-- CreateIndex
CREATE INDEX "Sesion_usuarioId_idx" ON "Sesion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_correo_key" ON "Cliente"("correo");

-- CreateIndex
CREATE INDEX "Direccion_clienteId_idx" ON "Direccion"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Marca_nombre_key" ON "Marca"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Marca_slug_key" ON "Marca"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_key" ON "Producto"("sku");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_idx" ON "Producto"("categoriaId");

-- CreateIndex
CREATE INDEX "Producto_marcaId_idx" ON "Producto"("marcaId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrito_clienteId_key" ON "Carrito"("clienteId");

-- CreateIndex
CREATE INDEX "CarritoItem_productoId_idx" ON "CarritoItem"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "CarritoItem_carritoId_productoId_key" ON "CarritoItem"("carritoId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_folio_key" ON "Pedido"("folio");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE INDEX "Pedido_estado_idx" ON "Pedido"("estado");

-- CreateIndex
CREATE INDEX "PedidoLinea_pedidoId_idx" ON "PedidoLinea"("pedidoId");

-- CreateIndex
CREATE INDEX "PedidoLinea_productoId_idx" ON "PedidoLinea"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cupon_codigo_key" ON "Cupon"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Cfdi_uuidFiscal_key" ON "Cfdi"("uuidFiscal");

-- CreateIndex
CREATE UNIQUE INDEX "Cfdi_pedidoId_key" ON "Cfdi"("pedidoId");

-- CreateIndex
CREATE INDEX "CfdiLinea_cfdiId_idx" ON "CfdiLinea"("cfdiId");

-- CreateIndex
CREATE INDEX "ComplementoPago_cfdiId_idx" ON "ComplementoPago"("cfdiId");

-- CreateIndex
CREATE UNIQUE INDEX "MetodoPago_codigo_key" ON "MetodoPago"("codigo");

-- CreateIndex
CREATE INDEX "Integracion_tipo_idx" ON "Integracion"("tipo");

-- AddForeignKey
ALTER TABLE "RegistroActividad" ADD CONSTRAINT "RegistroActividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrito" ADD CONSTRAINT "Carrito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarritoItem" ADD CONSTRAINT "CarritoItem_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "Carrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarritoItem" ADD CONSTRAINT "CarritoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cuponId_fkey" FOREIGN KEY ("cuponId") REFERENCES "Cupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "MetodoPago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoLinea" ADD CONSTRAINT "PedidoLinea_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoLinea" ADD CONSTRAINT "PedidoLinea_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cfdi" ADD CONSTRAINT "Cfdi_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfdiLinea" ADD CONSTRAINT "CfdiLinea_cfdiId_fkey" FOREIGN KEY ("cfdiId") REFERENCES "Cfdi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementoPago" ADD CONSTRAINT "ComplementoPago_cfdiId_fkey" FOREIGN KEY ("cfdiId") REFERENCES "Cfdi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetodoPago" ADD CONSTRAINT "MetodoPago_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Integracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
