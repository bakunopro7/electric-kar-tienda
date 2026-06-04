# electrick-Kar — Documentación del proyecto

Tienda en línea y panel de administración para **electrick-Kar**, comercio de refacciones y accesorios eléctricos automotrices (baterías, iluminación LED, audio, alternadores, alarmas, cableado, sensores). Construido como prototipo de alta fidelidad en HTML/CSS/JS, con identidad estilo WooCommerce: **azul eléctrico + blanco + gris**, acento **amarillo voltaje**.

---

## 1. Identidad y sistema de diseño

| Elemento | Valor |
|---|---|
| Tipografía titulares | **Space Grotesk** (600/700) |
| Tipografía texto | **Manrope** (400–700) |
| Tipografía datos/mono | **Space Mono** |
| Azul primario | `#0f4bd1` (Blue 700) · `#2f74ff` (Blue 500) |
| Navy (fondos oscuros) | `#04132a` · `#071f3d` |
| Acento voltaje | `#ffd21a` · `#f5b81a` |
| Estados | Verde `#16a36a` · Rojo `#e23b4e` |
| Radios | 8 / 14 / 22 px · pill |
| Modo oscuro | Sí, con preferencia persistente |

Tokens, sombras, componentes y escalas tipográficas viven en `assets/styles.css` y se documentan visualmente en el **Catálogo de componentes**.

---

## 2. Estructura de archivos

```
/
├── assets/
│   ├── styles.css              # Sistema de diseño (tokens + componentes)
│   ├── common.js               # Interacciones compartidas (carrito, etc.)
│   ├── fonts.css               # @font-face locales (sin CDN)
│   └── fonts/
│       ├── space-grotesk.woff2 # Fuente variable (latin)
│       ├── manrope.woff2       # Fuente variable (latin)
│       └── space-mono.woff2
│
├── Tienda (storefront)
│   ├── electrick-Kar - Inicio.html
│   ├── electrick-Kar - Tienda.html
│   ├── electrick-Kar - Destacados.html
│   ├── electrick-Kar - Producto.html
│   ├── electrick-Kar - Búsqueda.html
│   ├── electrick-Kar - Carrito.html
│   ├── electrick-Kar - Checkout.html
│   ├── electrick-Kar - Confirmación.html
│   ├── electrick-Kar - Favoritos.html
│   ├── electrick-Kar - Cuenta.html
│   ├── electrick-Kar - Acceso.html
│   ├── electrick-Kar - Blog.html
│   ├── electrick-Kar - Artículo.html
│   └── electrick-Kar - FAQ.html
│
├── electrick-Kar - Administrador.html        # Panel de administración (SPA)
└── electrick-Kar - Catálogo de componentes.html  # Design system navegable
```

---

## 3. Panel de administración

Archivo único `electrick-Kar - Administrador.html` que funciona como aplicación de una sola página (navegación por vistas con JS). Estructura de menú lateral:

### Super Admin (centro de control)
Acceso destacado (amarillo voltaje, indicador **LIVE**) con vista de alto nivel:
- **Hero de estado del sistema**: uptime de la tienda, PAC de timbrado, pasarela de pago, respaldo.
- **KPIs**: sesiones activas, latencia de API, accesos fallidos, almacenamiento.
- **Registro de actividad (auditoría)**: bitácora de quién hizo qué (acción, rol, IP, hora).
- **Sesiones activas**: dispositivos conectados, con opción de cerrar sesión.
- **Integraciones**: Finkok (PAC), Stripe, Estafeta, SAT — con acceso a configurar.
- **Zona de mantenimiento**: modo mantenimiento, respaldo de BD, purgar caché, cerrar todas las sesiones.

### General
- **Dashboard**: 4 KPIs (ventas, pedidos, clientes, ticket), gráfica de ventas animada, top productos, pedidos recientes, alertas de bajo inventario.
- **Pedidos**: tabla con filtros y estados (Nuevo / En preparación / Enviado / Entregado / Cancelado), paginación.
  - **Detalle de pedido**: artículos, **línea de tiempo de seguimiento**, datos de cliente, dirección de envío, resumen de pago, botón *Facturar (CFDI)*.
- **Productos**: tabla con SKU, categoría, precio, barra de inventario, estado.
  - **Crear / Editar producto**: información básica, imágenes, precios, inventario, organización (categoría/marca/etiquetas), envío, estado. El editar precarga los datos de la fila.
- **Clientes**: tabla con segmento (Nuevo / Frecuente / Mayoreo), pedidos y total gastado.

### Marketing
- **Cupones**: mini-stats + tabla con código tipo "ticket", barra de uso, vigencia y estado.
  - **Crear / Editar cupón**: tipo de descuento (porcentaje / monto fijo / envío gratis), valor, compra mínima, límites de uso, vigencia, estado, **vista previa en vivo** del cupón.
- **Reportes**: KPIs del periodo, **ventas por categoría** (barras horizontales animadas), **métodos de pago** (gráfica de dona), top clientes y productos más vendidos.

### Fiscal
- **Facturación electrónica (CFDI 4.0 · SAT México)**:
  - Mini-stats (timbradas, monto, por timbrar, canceladas) + banner del emisor (RFC, régimen, CSD, PAC).
  - Tabla de comprobantes con **folio · UUID**, RFC del receptor, uso CFDI, método (PUE/PPD), estado.
  - **Emitir CFDI**: datos del receptor (RFC, CP, régimen, uso CFDI con catálogos SAT), conceptos con clave SAT, pago (método/forma/moneda/tipo), totales con IVA e importe con letra.
  - **Cancelación de CFDI**: modal con motivo de cancelación (01–04) y folio fiscal sustituto.
  - **Complemento de pago (REP 2.0)**: para facturas PPD — datos del pago, documentos relacionados con parcialidad y saldos.

### Sistema
- **Usuarios y permisos**: equipo con roles (Super admin / Administrador / Vendedor / Contador), estado y último acceso; tarjetas de permisos por rol; **modal de invitación**.
- **Ajustes** (sub-secciones):
  - **Datos fiscales del emisor**: razón social, RFC, régimen, CP, serie/folio, carga de **CSD (.cer/.key)**, estado del PAC.
  - **Envíos**: envío gratis por monto, zonas y tarifas por paquetería.
  - **Impuestos**: IVA incluido, tasas general/fronteriza, retenciones IVA/ISR.
  - **Pagos**: métodos aceptados + accesos a configuración.

### Ventanas de configuración de integraciones
Mismo patrón visual (selector de proveedor, modo Prueba/Producción, credenciales con mostrar/ocultar, estado de conexión):
- **Pasarela de pago**: Stripe / Mercado Pago / Conekta / PayPal — llaves de API, webhook, captura, 3D Secure, MSI.
- **PAC de timbrado**: Finkok / Facturama / SW Sapien / Solución Factible — credenciales, comportamiento de timbrado, folios.
- **Paquetería**: Estafeta / DHL / FedEx / Paquetexpress — credenciales, generación de guías, seguro, recolección, rastreo.

### Métodos de pago y entrega
Vista dedicada (Ajustes › Pagos) con tarjetas configurables:
- **Tarjeta** de crédito/débito (Visa/MC/AMEX + MSI)
- **Transferencia SPEI**
- **Efectivo · OXXO Pay**
- **Recoger en tienda · Pick up** (con sucursal, horario, tiempo de preparación)
- **Vista previa del checkout** tal como lo ve el cliente.

### Funciones transversales del panel
- **Notificaciones**: panel desplegable informativo desde la barra superior, con "marcar leídas".
- **Tema oscuro**: interruptor sol/luna, persistente, cobertura completa de superficies.
- **Barra de scroll** del menú estilizada para el fondo oscuro.
- Toasts de confirmación en todas las acciones (guardar, timbrar, etc.).

---

## 4. Catálogo de componentes

`electrick-Kar - Catálogo de componentes.html` — página de referencia navegable del sistema de diseño con índice lateral y tema claro/oscuro. Documenta:

1. **Colores** — paleta de marca, neutros y estados con valores hex.
2. **Tipografía** — escala completa de las tres familias.
3. **Botones** — primario, voltaje, outline, ghost, tamaños, bloque.
4. **Badges y estados** — pedidos/CFDI, catálogo, roles, comisión, cupón.
5. **Formularios** — texto, select, llave/secreto, búsqueda.
6. **Controles** — switch, segmentado, paginación, chips, cantidad, barra de stock.
7. **Datos y tablas**.
8. **Navegación** — enlaces del sidebar.
9. **Tarjetas** — KPI y tarjeta de producto.
10. **Iconografía** — set base (SVG, trazo 2px, 24×24).
11. **Sombras y radios**.

---

## 5. Fuentes locales (sin CDN)

Las fuentes se descargaron de Google Fonts (subconjunto **latin**, archivos variables) y se sirven localmente desde `assets/fonts/`, declaradas en `assets/fonts.css`. Las **16 páginas** del proyecto se actualizaron para cargar las fuentes locales en lugar del CDN, dejando el sitio **autocontenido y funcional sin conexión**.

---

## 6. Notas técnicas

- Prototipo de interfaz: los datos (pedidos, productos, CFDI, llaves de API) son de ejemplo.
- La facturación CFDI real requiere integrar un **PAC autorizado** y los certificados (**CSD**) del SAT; aquí se modela la interfaz completa.
- Los pagos reales requieren conectar la **pasarela** (Stripe u otra) con llaves productivas.
- Sin dependencias externas ni build: se abre directamente en el navegador.
