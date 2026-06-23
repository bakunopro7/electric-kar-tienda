-- CreateTable
CREATE TABLE "DatosFiscales" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "razonSocial" VARCHAR(254) NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "cpFiscal" VARCHAR(10) NOT NULL,
    "regimenFiscal" VARCHAR(5) NOT NULL,
    "usoCfdi" VARCHAR(5) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosFiscales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatosFiscales_clienteId_key" ON "DatosFiscales"("clienteId");

-- AddForeignKey
ALTER TABLE "DatosFiscales" ADD CONSTRAINT "DatosFiscales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: impuestos por línea en CfdiLinea (defaults para filas existentes)
ALTER TABLE "CfdiLinea" ADD COLUMN "noIdentificacion" TEXT;
ALTER TABLE "CfdiLinea" ADD COLUMN "base" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "CfdiLinea" ADD COLUMN "impuesto" TEXT NOT NULL DEFAULT '002';
ALTER TABLE "CfdiLinea" ADD COLUMN "tipoFactor" TEXT NOT NULL DEFAULT 'Tasa';
ALTER TABLE "CfdiLinea" ADD COLUMN "tasaOCuota" TEXT NOT NULL DEFAULT '0.160000';
ALTER TABLE "CfdiLinea" ADD COLUMN "importeImpuesto" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "CfdiLinea" ADD COLUMN "objetoImp" TEXT NOT NULL DEFAULT '02';
