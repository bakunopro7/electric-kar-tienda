# electrick-Kar — Catálogo de datos

Diccionario de datos del sistema (tienda + panel de administración). Describe las entidades, sus atributos, tipos, relaciones y catálogos controlados. Sirve como referencia para modelar la base de datos o la API.

**Convenciones de tipo:** `string`, `text` (largo), `int`, `decimal(12,2)`, `bool`, `date` (AAAA-MM-DD), `datetime` (ISO 8601), `enum` (valor de catálogo), `fk` (llave foránea), `uuid`.

---

## Mapa de entidades

```
Cliente ─┐
         ├─< Pedido ─< PedidoLínea >─ Producto >─ Categoría
         │      │                          └─ Marca
         │      └─1 CFDI ─< CFDILínea
         │            └─< ComplementoPago (REP)
         └─< Dirección

Cupón ─(aplica a)─ Pedido
Usuario ─(rol)─ Rol ─< Permiso
Usuario ─< RegistroActividad
Usuario ─< Sesión
Integración (pasarela / PAC / paquetería)
MétodoPago / MétodoEntrega
```

---

## 1. Producto (`products`)

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | int (PK) | Identificador interno | 1042 |
| `nombre` | string | Nombre comercial | Batería AGM 12V 70Ah Heavy Duty |
| `sku` | string (único) | Código de inventario | BAT-AGM-70 |
| `codigo_barras` | string | Código de barras (EAN/UPC) | 7 50000 00000 0 |
| `descripcion` | text | Descripción larga | … |
| `descripcion_corta` | string | Resumen de una línea | … |
| `categoria_id` | fk → Categoría | Categoría | 3 |
| `marca_id` | fk → Marca | Marca | 5 |
| `precio` | decimal(12,2) | Precio de venta | 2499.00 |
| `precio_comparativo` | decimal(12,2) | Precio anterior (tachado) | 2990.00 |
| `costo` | decimal(12,2) | Costo del producto | 1680.00 |
| `tasa_iva` | enum | `16` / `8` / `0` | 16 |
| `existencias` | int | Stock actual | 4 |
| `stock_minimo` | int | Umbral de aviso de bajo stock | 5 |
| `seguir_inventario` | bool | Descuenta stock por venta | true |
| `permitir_sin_stock` | bool | Permite compra sin existencias | false |
| `clave_prod_sat` | string | c_ClaveProdServ (catálogo SAT) | 26111702 |
| `peso_kg` | decimal | Peso para envío | 18.5 |
| `clase_envio` | enum | `estandar` / `voluminoso` / `fragil` | estandar |
| `estado` | enum | `publicado` / `borrador` / `programado` | publicado |
| `etiquetas` | string[] | Tags de búsqueda | ["12V","heavy duty"] |
| `imagenes` | string[] | URLs (1ª = principal) | … |

**Estado de inventario (derivado):** `ok` (≥ mínimo), `low` (< mínimo), `out` (0).

---

## 2. Categoría (`categories`) y Marca (`brands`)

**Categoría**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int (PK) | Identificador |
| `nombre` | string | Baterías, Iluminación LED, Audio & Estéreo, Alternadores, Alarmas, Cableado, Sensores |
| `slug` | string | Identificador URL |

**Marca**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int (PK) | Identificador |
| `nombre` | string | Bosch, LTH, Pioneer, Hella, Genérica |

---

## 3. Cliente (`customers`)

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | int (PK) | Identificador | 318 |
| `nombre` | string | Nombre completo / razón social | Juan Pérez |
| `correo` | string (único) | Email | juan@correo.com |
| `telefono` | string | Teléfono | 55 1234 5678 |
| `segmento` | enum | `nuevo` / `frecuente` / `mayoreo` | frecuente |
| `pedidos_count` | int | Total de pedidos | 12 |
| `total_gastado` | decimal(12,2) | Acumulado histórico | 28940.00 |
| `rfc` | string | RFC (para facturación) | CARI850912H4A |
| `creado_en` | datetime | Alta del cliente | 2025-11-02T… |

**Dirección (`addresses`)** — relación 1:N con Cliente

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int (PK) | Identificador |
| `cliente_id` | fk → Cliente | Dueño |
| `calle`, `interior`, `colonia` | string | Domicilio |
| `cp` | string | Código postal |
| `ciudad`, `estado` | string | Ubicación |

---

## 4. Pedido (`orders`)

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string (PK) | Folio de pedido | #EK-204815 |
| `cliente_id` | fk → Cliente | Comprador | 318 |
| `fecha` | datetime | Fecha de creación | 2026-06-03T10:12 |
| `estado` | enum | `new` / `prep` / `ship` / `done` / `cancel` | prep |
| `subtotal` | decimal(12,2) | Suma de líneas | 5992.00 |
| `descuento` | decimal(12,2) | Total descuentos | 899.00 |
| `cupon_id` | fk → Cupón (nullable) | Cupón aplicado | LEDFEST15 |
| `envio` | decimal(12,2) | Costo de envío | 0.00 |
| `iva` | decimal(12,2) | Impuesto | 702.00 |
| `total` | decimal(12,2) | Total a pagar | 4676.00 |
| `metodo_pago` | fk → MétodoPago | Forma de pago | card |
| `metodo_entrega` | enum | `envio` / `pickup` | envio |
| `paqueteria` | string | Transportista | Estafeta |
| `cfdi_id` | fk → CFDI (nullable) | Factura asociada | A-18451 |

**Estados:** `new` (Nuevo) → `prep` (En preparación) → `ship` (Enviado) → `done` (Entregado); `cancel` (Cancelado).

**Línea de pedido (`order_items`)**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int (PK) | Identificador |
| `pedido_id` | fk → Pedido | Pedido padre |
| `producto_id` | fk → Producto | Artículo |
| `cantidad` | int | Unidades |
| `precio_unitario` | decimal(12,2) | Precio al momento de la venta |
| `importe` | decimal(12,2) | cantidad × precio_unitario |

---

## 5. Cupón (`coupons`)

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | int (PK) | Identificador | 12 |
| `codigo` | string (único) | Código que captura el cliente | VERANO20 |
| `tipo` | enum | `porcentaje` / `monto_fijo` / `envio_gratis` | porcentaje |
| `valor` | decimal | % o monto según tipo | 20 |
| `compra_minima` | decimal(12,2) | Mínimo para aplicar | 999.00 |
| `limite_total` | int (nullable) | Usos máximos globales | 500 |
| `limite_por_cliente` | int | Usos por cliente | 1 |
| `aplica_a` | enum | `tienda` / `categorias` / `productos` | tienda |
| `solo_primera_compra` | bool | Exclusivo clientes nuevos | false |
| `no_acumulable` | bool | No combina con otros | true |
| `fecha_inicio` | date | Inicio de vigencia | 2026-06-03 |
| `fecha_fin` | date | Fin de vigencia | 2026-06-30 |
| `usos` | int | Veces canjeado | 184 |
| `estado` | enum | `activo` / `programado` / `por_expirar` / `expirado` | activo |

---

## 6. CFDI / Comprobante fiscal (`invoices`)

Factura electrónica **CFDI 4.0** (SAT México).

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | string (PK) | Serie-folio | A-18451 |
| `uuid` | uuid | Folio fiscal (timbre SAT) | 9F2C7A1B-… |
| `pedido_id` | fk → Pedido | Pedido origen | #EK-204815 |
| `emisor_rfc` | string | RFC del emisor | EKA210345XY8 |
| `receptor_nombre` | string | Razón social del receptor | Carlos Ríos |
| `receptor_rfc` | string | RFC del receptor | CARI850912H4A |
| `receptor_cp` | string | Código postal del receptor | 03100 |
| `receptor_regimen` | enum | Régimen fiscal (catálogo SAT) | 612 |
| `uso_cfdi` | enum | Uso del CFDI (catálogo SAT) | G03 |
| `tipo_comprobante` | enum | `I` (Ingreso) / `E` (Egreso) / `P` (Pago) | I |
| `metodo_pago` | enum | `PUE` / `PPD` | PUE |
| `forma_pago` | enum | Forma de pago SAT (01,03,04,28,99) | 03 |
| `moneda` | enum | `MXN` / `USD` | MXN |
| `subtotal` | decimal(12,2) | Subtotal | 2929.31 |
| `descuento` | decimal(12,2) | Descuento | 0.00 |
| `iva` | decimal(12,2) | IVA trasladado | 468.69 |
| `total` | decimal(12,2) | Total | 3398.00 |
| `fecha` | datetime | Fecha de emisión | 2026-06-03 |
| `estado` | enum | `done` (Timbrada) / `new` (Por timbrar) / `cancel` (Cancelada) | done |
| `motivo_cancelacion` | enum (nullable) | `01` / `02` / `03` / `04` | 02 |
| `uuid_sustituye` | uuid (nullable) | Folio que sustituye (motivo 01) | … |

**Línea de CFDI (`invoice_items`)**

| Campo | Tipo | Descripción |
|---|---|---|
| `clave_prod_sat` | string | c_ClaveProdServ |
| `clave_unidad_sat` | string | c_ClaveUnidad |
| `descripcion` | string | Concepto |
| `cantidad` | int | Cantidad |
| `precio_unitario` | decimal(12,2) | Valor unitario |
| `importe` | decimal(12,2) | Importe |

**Complemento de pago / REP (`payment_complements`)** — para CFDI con método `PPD`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string (PK) | Folio del REP |
| `cfdi_id` | fk → CFDI | Factura PPD relacionada |
| `fecha_pago` | datetime | Fecha y hora del pago |
| `forma_pago` | enum | Forma de pago SAT |
| `monto` | decimal(12,2) | Monto del pago |
| `moneda` | enum | MXN / USD |
| `clabe_ordenante` | string | Cuenta ordenante |
| `banco_emisor` | string | Banco |
| `parcialidad` | int | Número de parcialidad |
| `saldo_anterior` | decimal(12,2) | Saldo previo |
| `saldo_insoluto` | decimal(12,2) | Saldo restante |

---

## 7. Usuario, Rol y Permiso

**Usuario (`users`)** — miembros del equipo con acceso al panel

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | int (PK) | Identificador | 1 |
| `nombre` | string | Nombre | Roberto Méndez |
| `correo` | string (único) | Email corporativo | roberto@electrick-kar.mx |
| `rol` | enum → Rol | `super` / `admin` / `vend` / `cont` | super |
| `estado` | enum | `online` (Activo) / `invited` (Invitado) / `off` (Inactivo) | online |
| `ultimo_acceso` | datetime | Último ingreso | … |

**Rol (`roles`)** y **Permiso**

| Rol | Permisos clave |
|---|---|
| `super` — Super admin | Acceso total, gestión de usuarios, datos fiscales y CSD |
| `admin` — Administrador | Pedidos, productos, clientes, cupones, reportes, facturación (no usuarios) |
| `vend` — Vendedor | Gestionar pedidos, consultar clientes/productos (no precios ni ajustes) |
| `cont` — Contador | Emitir/cancelar/timbrar CFDI, reportes y datos fiscales (no inventario) |

---

## 8. Seguridad y auditoría

**Registro de actividad (`activity_log`)**

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | int (PK) | Identificador | 9001 |
| `tipo` | enum | `create` / `edit` / `delete` / `login` / `fiscal` | fiscal |
| `descripcion` | string | Acción realizada | Canceló CFDI A-18446 (motivo 02) |
| `usuario_id` | fk → Usuario | Autor | 5 |
| `ip` | string | Dirección IP | 201.140.2.7 |
| `fecha` | datetime | Momento | … |

**Sesión (`sessions`)**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador de sesión |
| `usuario_id` | fk → Usuario | Dueño |
| `dispositivo` | string | Navegador / SO |
| `ubicacion` | string | Ciudad |
| `ip` | string | Dirección IP |
| `activa` | bool | En curso |

---

## 9. Métodos de pago y entrega

**Método de pago (`payment_methods`)**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | enum (PK) | `card` / `spei` / `oxxo` / `pickup` |
| `nombre` | string | Tarjeta, Transferencia SPEI, OXXO Pay, Recoger en tienda |
| `comision` | string | Esquema de comisión (ej. 3.6% + $3) |
| `activo` | bool | Disponible en checkout |
| `proveedor` | fk → Integración | Procesador asociado |

**Configuración de Pick up (`pickup_config`)**

| Campo | Tipo | Descripción |
|---|---|---|
| `sucursal` | string | Nombre de la sucursal |
| `direccion` | string | Domicilio de recolección |
| `horario` | string | Días y horas |
| `tiempo_preparacion` | enum | `2h` / `mismo_dia` / `24h` |
| `pago` | enum | `linea_o_sucursal` / `solo_linea` / `solo_sucursal` |
| `aviso_listo` | bool | Notifica cuando está listo |

---

## 10. Integraciones (`integrations`)

Configuración de servicios externos. Patrón común a pasarela, PAC y paquetería.

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | enum | `pasarela` / `pac` / `paqueteria` |
| `proveedor` | string | Stripe, Finkok, Estafeta, etc. |
| `modo` | enum | `test` (Pruebas) / `live` (Producción) |
| `credenciales` | json | Llaves de API / tokens (cifradas) |
| `webhook_url` | string | URL de notificaciones |
| `estado` | enum | `conectado` / `desconectado` / `error` |
| `opciones` | json | Ajustes específicos por servicio |

**Por tipo:**

| Tipo | Proveedores | Opciones destacadas |
|---|---|---|
| Pasarela | Stripe, Mercado Pago, Conekta, PayPal | moneda, captura, guardar tarjetas, 3D Secure, MSI |
| PAC | Finkok, Facturama, SW Sapien, Solución Factible | timbrado automático, envío XML/PDF, factura global, folios |
| Paquetería | Estafeta, DHL, FedEx, Paquetexpress | C.P. origen, empaque, guía automática, seguro, recolección, rastreo |

---

## Catálogos SAT de referencia

| Catálogo | Valores usados |
|---|---|
| **Régimen fiscal** | 601 General PM · 612 PF Act. Empresarial · 626 RESICO · 605 Sueldos · 616 Sin obligaciones |
| **Uso CFDI** | G01 Adquisición · G02 Devoluciones · G03 Gastos en general · I04 Equipo cómputo · I08 Maquinaria · S01 Sin efectos |
| **Método de pago** | PUE (una exhibición) · PPD (parcialidades/diferido) |
| **Forma de pago** | 01 Efectivo · 03 Transferencia · 04 TC · 28 TD · 99 Por definir |
| **Tipo comprobante** | I Ingreso · E Egreso · P Pago |
| **Motivo cancelación** | 01 con relación · 02 sin relación · 03 no se realizó · 04 factura global |

---

> **Nota:** Modelo de datos inferido de la interfaz del prototipo. Los nombres de tabla/campo son una propuesta y pueden ajustarse al ORM o esquema final.
