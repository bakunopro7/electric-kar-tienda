-- Add missing foreign-key indexes and audit-log composite index.
-- Prisma does not auto-create indexes on relation scalar (FK) columns; only
-- @id and @unique get one. These FKs were unindexed, forcing sequential scans
-- on reverse-relation joins and ON DELETE SET NULL cascades.

-- Pedido FKs
CREATE INDEX "Pedido_cuponId_idx" ON "Pedido"("cuponId");
CREATE INDEX "Pedido_metodoPagoId_idx" ON "Pedido"("metodoPagoId");

-- MetodoPago FK
CREATE INDEX "MetodoPago_proveedorId_idx" ON "MetodoPago"("proveedorId");

-- RegistroActividad: serves WHERE tipo = ? ORDER BY fecha DESC in one index scan.
CREATE INDEX "RegistroActividad_tipo_fecha_idx" ON "RegistroActividad"("tipo", "fecha");
