# Salud de la base de datos — bitácora de remediación

Documento vivo. Vamos resolviendo los hallazgos poco a poco y los tildamos acá.
Cada fila apunta a `archivo:línea` para que el arreglo sea accionable.

Origen de la auditoría: revisión del schema Prisma + queries de los services
(`electric-kar/`). Última actualización: 2026-06-08.

---

## 1. Índices

### Resueltos

| Hallazgo | Ubicación | Estado |
|---|---|---|
| FK `Pedido.cuponId` sin índice | `prisma/schema.prisma` (model `Pedido`) | ✅ `Pedido_cuponId_idx` |
| FK `Pedido.metodoPagoId` sin índice | `prisma/schema.prisma` (model `Pedido`) | ✅ `Pedido_metodoPagoId_idx` |
| FK `MetodoPago.proveedorId` sin índice | `prisma/schema.prisma` (model `MetodoPago`) | ✅ `MetodoPago_proveedorId_idx` |
| Filtro `tipo` sin índice en audit log | `src/auditoria/auditoria.service.ts:25` | ✅ `RegistroActividad_tipo_fecha_idx` (compuesto, sirve `WHERE tipo ORDER BY fecha`) |

Migración: `prisma/migrations/20260608084217_db_health_indexes/`.
Aplicada con `pnpm prisma:deploy` + `pnpm prisma:generate`. Índices verificados
en PostgreSQL vía `pg_indexes`.

> **Por qué importaba:** Prisma NO crea índices automáticos en las columnas
> escalares de relación (`xxxId`); solo en `@id` y `@unique`. Una FK sin índice
> fuerza sequential scan en joins inversos y en cascadas `ON DELETE SET NULL`.

### Pendientes (baja prioridad — omitidos a propósito)

| Hallazgo | Ubicación | Por qué se difiere |
|---|---|---|
| `Sesion.activa` se beneficiaría de índice **parcial** | `prisma/schema.prisma` (model `Sesion`), queries en `src/sesiones/sesiones.service.ts:10,29` | Prisma DSL no expresa índices parciales (`WHERE activa = true`). Meterlo solo por SQL crea drift schema↔BD. Revisar cuando la tabla crezca. |
| `@@index([orden])` redundante en `MenuItem` | `prisma/schema.prisma` (model `MenuItem`) | Tabla de ~50 filas máx; el índice solo agrega costo de escritura sin beneficio. Quitarlo es inocuo pero irrelevante. |

---

## 2. N+1 y fetch sin cota

### Resueltos

| Hallazgo | Ubicación | Estado |
|---|---|---|
| N+1 real: `producto.update` secuencial por ítem en checkout | `src/orders/orders.service.ts` (transacción de `checkout`) | ✅ Reescrito a `Promise.all` sobre los items con `seguirInventario` |

> El loop original disparaba un `UPDATE` awaiteado por cada ítem del carrito,
> manteniendo locks de la transacción abiertos toda la cadena. `Promise.all`
> pipelinea los updates sobre la misma conexión.

### Pendientes

| Hallazgo | Ubicación | Nota |
|---|---|---|
| `findAll()` sin paginación en pedidos | `src/orders/orders.service.ts:171` | **No es N+1** (Prisma lo resuelve en 3 queries con `include`). Es fetch sin cota. Capar silenciosamente rompería el panel admin → requiere paginación real coordinada back + front. Tratar como feature, no parche. |
| `findAll()` sin paginación en CFDI | `src/cfdi/cfdi.service.ts:144` | Mismo caso. Crece sin límite con cada CFDI emitido. |

---

## Cómo agregar un arreglo a esta bitácora

1. Resolvés el hallazgo (schema / migración / código).
2. Movés la fila de **Pendientes** a **Resueltos** con `✅` y la referencia concreta.
3. Si fue cambio de schema: migración a mano (`migrate dev` no corre en este
   entorno) → `pnpm prisma:deploy` → `pnpm prisma:generate` → verificar en
   PostgreSQL.
