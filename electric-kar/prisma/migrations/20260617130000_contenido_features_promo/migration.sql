-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "icono" VARCHAR(40) NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "texto" VARCHAR(255) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "badge" VARCHAR(60) NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "texto" VARCHAR(255) NOT NULL,
    "descuento" VARCHAR(20) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "ctaTexto" VARCHAR(60) NOT NULL,
    "ctaUrl" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);
