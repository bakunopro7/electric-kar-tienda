-- Blog
CREATE TABLE "Articulo" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "contenido" TEXT[],
    "imagen" TEXT,
    "autorNombre" TEXT NOT NULL,
    "autorRol" TEXT,
    "lectura" TEXT,
    "etiqueta" TEXT,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "publicado" BOOLEAN NOT NULL DEFAULT true,
    "publicadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Articulo_slug_key" ON "Articulo"("slug");
CREATE INDEX "Articulo_publicado_idx" ON "Articulo"("publicado");
CREATE INDEX "Articulo_categoria_idx" ON "Articulo"("categoria");
