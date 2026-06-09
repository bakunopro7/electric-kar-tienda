-- Cap identity/index columns with varchar(n) as a DB-level safety net.
-- All caps are >= the corresponding DTO @MaxLength and >= any realistic value,
-- so these ALTERs do not truncate populated rows.
ALTER TABLE "Cliente"   ALTER COLUMN "nombre"      TYPE VARCHAR(120);
ALTER TABLE "Cliente"   ALTER COLUMN "correo"      TYPE VARCHAR(254);
ALTER TABLE "Usuario"   ALTER COLUMN "nombre"      TYPE VARCHAR(120);
ALTER TABLE "Usuario"   ALTER COLUMN "correo"      TYPE VARCHAR(254);
ALTER TABLE "Producto"  ALTER COLUMN "nombre"      TYPE VARCHAR(150);
ALTER TABLE "Producto"  ALTER COLUMN "sku"         TYPE VARCHAR(60);
ALTER TABLE "Cupon"     ALTER COLUMN "codigo"      TYPE VARCHAR(40);
ALTER TABLE "Cfdi"      ALTER COLUMN "receptorRfc" TYPE VARCHAR(13);
ALTER TABLE "Cfdi"      ALTER COLUMN "receptorCp"  TYPE VARCHAR(10);
ALTER TABLE "Direccion" ALTER COLUMN "cp"          TYPE VARCHAR(10);
