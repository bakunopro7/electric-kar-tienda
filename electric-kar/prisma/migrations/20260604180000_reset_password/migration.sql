-- Recuperación de contraseña (Cliente)
ALTER TABLE "Cliente" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "resetTokenExpira" TIMESTAMP(3);

CREATE UNIQUE INDEX "Cliente_resetToken_key" ON "Cliente"("resetToken");
