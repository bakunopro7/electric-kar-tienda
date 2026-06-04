# electrick-Kar — Catálogo de datos por rol

Define qué datos puede **ver** y **modificar** cada rol del panel. Complementa al [Catálogo de datos](CATALOGO-DATOS.md) (modelo completo de entidades).

**Niveles de acceso:**
`—` sin acceso · `R` ver (lectura) · `RW` ver y editar · `RWD` ver, editar y eliminar · `C` crear

**Roles:** Super admin (`super`) · Administrador (`admin`) · Vendedor (`vend`) · Contador (`cont`)

---

## Matriz de acceso (resumen)

| Entidad | Super admin | Administrador | Vendedor | Contador |
|---|:--:|:--:|:--:|:--:|
| Producto | RWD + C | RWD + C | R | R |
| Categoría / Marca | RWD + C | RWD + C | R | — |
| Cliente | RWD + C | RWD + C | R | R |
| Dirección | RWD | RWD | R | R |
| Pedido | RWD | RWD | RW | R |
| Línea de pedido | RWD | RWD | R | R |
| Cupón | RWD + C | RWD + C | R | — |
| CFDI (factura) | RWD + C | RW + C | — | RWD + C |
| Complemento de pago (REP) | RW + C | R | — | RW + C |
| Usuario / Rol / Permiso | RWD + C | — | — | — |
| Registro de actividad | R | — | — | R (propios) |
| Sesión | RWD | — | — | — |
| Métodos de pago / entrega | RW | RW | — | R |
| Integración: Pasarela | RW | R | — | R |
| Integración: PAC (timbrado) | RW | — | — | RW |
| Integración: Paquetería | RW | RW | R | — |
| Ajustes › Datos fiscales (emisor/CSD) | RW | — | — | RW |
| Ajustes › Envíos / Impuestos / Pagos | RW | RW | — | R (impuestos) |
| Reportes | R | R | R (ventas) | R (fiscal) |
| Dashboard | R | R | R | R |

---

## 1. Super admin (`super`)

Control total del sistema. Único rol que administra usuarios, seguridad e infraestructura.

| Datos | Acceso | Notas |
|---|:--:|---|
| **Todas las entidades de negocio** | RWD + C | Productos, pedidos, clientes, cupones, CFDI |
| **Usuario / Rol / Permiso** | RWD + C | Invitar, cambiar rol, revocar acceso |
| **Registro de actividad (auditoría)** | R | Toda la bitácora, con IP y autor |
| **Sesión** | RWD | Cerrar sesiones individuales o todas |
| **Datos fiscales del emisor + CSD** | RW | RFC, régimen, certificados .cer/.key |
| **Integraciones** (pasarela, PAC, paquetería) | RW | Llaves de API, modo prueba/producción |
| **Zona de mantenimiento** | RW | Modo mantenimiento, respaldos, purgar caché |
| **Ajustes completos** | RW | Envíos, impuestos, pagos |

**Campos sensibles visibles:** llaves secretas de API, contraseña de CSD, IPs de sesión, RFC de emisor.

---

## 2. Administrador (`admin`)

Opera la tienda completa, pero **no** gestiona usuarios ni datos fiscales del emisor.

| Datos | Acceso | Notas |
|---|:--:|---|
| **Producto / Categoría / Marca** | RWD + C | Alta, edición y baja; precios y stock |
| **Cliente / Dirección** | RWD + C | Gestión completa de clientes |
| **Pedido / Línea de pedido** | RWD | Cambiar estado, editar, cancelar |
| **Cupón** | RWD + C | Crear y administrar promociones |
| **CFDI** | RW + C | Emitir y timbrar (no configura el PAC) |
| **Complemento de pago (REP)** | R | Consulta |
| **Métodos de pago / entrega** | RW | Activar/desactivar, configurar pick up |
| **Integración: Pasarela / Paquetería** | RW / R | Paquetería editable; pasarela solo lectura |
| **Ajustes › Envíos / Impuestos / Pagos** | RW | Sin datos fiscales del emisor |
| **Reportes / Dashboard** | R | Analítica completa |
| Usuarios, CSD, sesiones, auditoría | — | Reservado a Super admin |

**Restricciones:** no ve llaves secretas de pasarela ni certificados CSD; no administra el equipo.

---

## 3. Vendedor (`vend`)

Atención y ventas. Trabaja sobre pedidos; **consulta** catálogo y clientes sin editar precios ni ajustes.

| Datos | Acceso | Notas |
|---|:--:|---|
| **Pedido** | RW | Ver detalle, avanzar estado, registrar envío |
| **Línea de pedido** | R | Solo consulta |
| **Cliente / Dirección** | R | Datos de contacto y envío |
| **Producto / Categoría / Marca** | R | Consulta de stock y ficha (no edita precios) |
| **Cupón** | R | Verifica validez al cobrar |
| **Integración: Paquetería** | R | Genera/consulta guías de sus pedidos |
| **Reportes › Ventas** | R | Solo desempeño de ventas |
| **Dashboard** | R | Vista general |
| CFDI, pagos, ajustes, usuarios, fiscal | — | Sin acceso |

**Restricciones:** no edita precios, inventario ni ajustes; no emite ni ve facturas.

---

## 4. Contador (`cont`)

Facturación y obligaciones fiscales. Trabaja sobre CFDI y datos fiscales; **no** toca inventario ni ventas operativas.

| Datos | Acceso | Notas |
|---|:--:|---|
| **CFDI (factura)** | RWD + C | Emitir, timbrar y **cancelar** (motivos 01–04) |
| **Línea de CFDI** | RWD + C | Conceptos y claves SAT |
| **Complemento de pago (REP)** | RW + C | Registrar y timbrar pagos PPD |
| **Cliente** | R | Datos fiscales (RFC, régimen, CP) |
| **Pedido** | R | Para facturar (no modifica) |
| **Producto** | R | Claves SAT y precios para conceptos |
| **Datos fiscales del emisor + CSD** | RW | RFC, régimen, serie/folio, certificados |
| **Integración: PAC (timbrado)** | RW | Proveedor, folios, comportamiento |
| **Ajustes › Impuestos** | R | Tasas IVA, retenciones |
| **Reportes › Fiscal** | R | Comprobantes, montos facturados |
| **Registro de actividad** | R | Solo sus propias acciones |
| Inventario, cupones, usuarios, pasarela, envíos | — | Sin acceso |

**Campos sensibles visibles:** RFC de emisor, contraseña de CSD, credenciales del PAC.

---

## Notas de implementación

- El control de acceso es a nivel de **entidad** y, en casos marcados, de **campo** (ej. precios para Vendedor, llaves secretas para no-Super admin).
- El **Super admin** es el único que no puede ser eliminado y el único con acceso a *Usuarios y permisos*, *Sesiones* y la *Zona de mantenimiento*.
- Toda acción de escritura (`RW`/`RWD`/`C`) debería quedar registrada en **Registro de actividad** con usuario, IP y fecha.
- Sugerencia de aplicación: middleware de autorización por `rol` + tabla `permisos(rol, entidad, accion)` para granularidad fina.
