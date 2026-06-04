-- Catálogo genérico
CREATE TABLE "Catalogo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Catalogo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Catalogo_tipo_idx" ON "Catalogo"("tipo");
CREATE UNIQUE INDEX "Catalogo_tipo_clave_key" ON "Catalogo"("tipo", "clave");

-- Catálogos SAT
CREATE TABLE "CatalogoSat" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogoSat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatalogoSat_tipo_idx" ON "CatalogoSat"("tipo");
CREATE UNIQUE INDEX "CatalogoSat_tipo_clave_key" ON "CatalogoSat"("tipo", "clave");
