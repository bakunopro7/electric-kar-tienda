-- CreateTable
CREATE TABLE "CertificadoSello" (
    "id" TEXT NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "noCertificado" VARCHAR(20) NOT NULL,
    "cerPem" TEXT NOT NULL,
    "keyEnc" TEXT NOT NULL,
    "passEnc" TEXT NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3) NOT NULL,
    "modo" "ModoIntegracion" NOT NULL DEFAULT 'PRUEBAS',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificadoSello_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificadoSello_modo_activo_idx" ON "CertificadoSello"("modo", "activo");
