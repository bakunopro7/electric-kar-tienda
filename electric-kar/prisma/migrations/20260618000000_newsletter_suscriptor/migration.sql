-- CreateTable
CREATE TABLE "Suscriptor" (
    "id" TEXT NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "origen" VARCHAR(40) NOT NULL DEFAULT 'newsletter',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suscriptor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suscriptor_correo_key" ON "Suscriptor"("correo");

-- CreateIndex
CREATE INDEX "Suscriptor_creadoEn_idx" ON "Suscriptor"("creadoEn");
