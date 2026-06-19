-- CreateTable
CREATE TABLE "DatosContacto" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "direccion" VARCHAR(200) NOT NULL,
    "telefono" VARCHAR(40) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "horario" VARCHAR(120) NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosContacto_pkey" PRIMARY KEY ("id")
);

-- Seed inicial (los valores que estaban hardcodeados en el front)
INSERT INTO "DatosContacto" ("id", "direccion", "telefono", "correo", "horario", "actualizadoEn")
VALUES ('singleton', 'Av. Tecnología 1200, CDMX', '55 1234 5678', 'hola@electrick-kar.com', 'Lun a Sáb · 9:00 - 19:00', CURRENT_TIMESTAMP);
