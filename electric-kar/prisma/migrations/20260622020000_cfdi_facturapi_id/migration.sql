-- AlterTable: id de la factura en Facturapi (PAC full-service)
ALTER TABLE "Cfdi" ADD COLUMN "facturapiId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cfdi_facturapiId_key" ON "Cfdi"("facturapiId");
