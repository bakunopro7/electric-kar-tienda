# electrick-Kar — Documentación del proyecto

Tienda en línea **full-stack** + **panel de administración** para **electrick-Kar**,
comercio de refacciones y accesorios eléctricos automotrices (baterías, iluminación
LED, audio, alternadores, alarmas, cableado, sensores). Enfoque **México** (CFDI 4.0,
SAT, paqueterías, pasarelas locales).

---

## 1. Arquitectura general

```
tiendaOnline/
├── electric-kar/          # Backend — API REST (NestJS 11 + Prisma 7 + PostgreSQL)
│   ├── prisma/            # schema.prisma, migraciones, seed
│   ├── src/               # módulos de la API
│   └── recursos/          # prototipo HTML/CSS de referencia + catálogos de datos
└── electric-kar-front/    # Frontend — Angular 21 + Tailwind v4 (tienda + panel)
```

- **Backend**: `http://localhost:3000/api` · Swagger en `/docs`.
- **Frontend**: `http://localhost:4200` (tienda) y `/admin` (panel).
- **Gestor de paquetes**: `pnpm` en ambos proyectos.

---

## 2. Backend — NestJS 11 + Prisma 7

### Stack
- **NestJS 11** (standalone, TypeScript), **Prisma 7** con **driver adapter** `@prisma/adapter-pg` (PostgreSQL), **JWT** (`@nestjs/jwt` + Passport), **class-validator** + `ValidationPipe` global, **Swagger**.
- El cliente Prisma se genera en `src/generated/prisma` con `moduleFormat = "cjs"`.

### Modelo de datos (17 entidades, nombres en español)
`Usuario`, `RegistroActividad`, `Sesion`, `Cliente`, `Direccion`, `Categoria`,
`Marca`, `Producto`, `Carrito`/`CarritoItem`, `Pedido`/`PedidoLinea`, `Cupon`,
`Cfdi`/`CfdiLinea`/`ComplementoPago`, `MetodoPago`, `ConfigPickup`, `Integracion`,
`MenuItem`. Enums para roles, estados, catálogos SAT, etc.

### Autenticación y roles
- **Dos principales** distinguidos por el claim `tipo` del JWT:
  - **`Cliente`** (tienda): `register`/`login`, carrito, checkout, pedidos.
  - **`Usuario`** (panel): `staff/login`, con `Rol` = `SUPER` / `ADMIN` / `VENDEDOR` / `CONTADOR`.
- Guards: `JwtAuthGuard`, `ClienteGuard`, `RolesGuard`. Control de acceso por rol
  según `recursos/CATALOGO-DATOS-POR-ROL.md`.

### Módulos / endpoints principales (prefijo `/api`)
| Módulo | Rutas | Acceso |
|---|---|---|
| `auth` | `register`, `login`, `staff/login`, `me` | público / autenticado |
| `users` | CRUD personal | SUPER |
| `clientes` | perfil/direcciones (cliente); listado/segmento (personal) | cliente / personal |
| `categories`, `marcas` | CRUD (lectura pública) | escritura ADMIN/SUPER |
| `products` | CRUD + filtros + paginación | escritura ADMIN/SUPER |
| `cart` | carrito del cliente | cliente |
| `orders` | `checkout`, historial; gestión de estado | cliente / personal |
| `cupones` | CRUD + `validate` | personal / cliente |
| `cfdi` | emitir/timbrar*/cancelar/REP | CONTADOR/ADMIN/SUPER |
| `integraciones`, `metodos-pago`, `config-pickup` | configuración | ADMIN/SUPER (credenciales SUPER) |
| `auditoria`, `sesiones` | bitácora y sesiones | SUPER |
| `menu` | menú de navegación (CMS) | público / ADMIN/SUPER |
| `health` | health check | público |

### Lógica destacada del checkout
- Genera **folio** (`EK-204816`…), descuenta inventario, vacía carrito, actualiza al cliente.
- **IVA incluido**: `iva = Σ(importe × tasaIva / (100+tasaIva))`.
- **Cupón**: valida (vigencia, límite, compra mínima), aplica descuento al total e incrementa usos.

### Auditoría (enfoque mixto)
- Interceptor global registra automáticamente toda escritura del personal.
- Acciones críticas (login, CFDI) se registran manualmente con `@SkipAudit()`.

---

## 3. Frontend — Angular 21 + Tailwind v4

### Stack
- **Angular 21** (standalone + signals), **Tailwind CSS v4** (tokens del sistema de
  diseño en `src/styles.css` vía `@theme`; modo oscuro por clase), `HttpClient` con
  interceptor que adjunta el token correcto (cliente vs panel) mediante `HttpContext`.

### Sistema de diseño
Azul eléctrico (`#0f4bd1`/`#2f74ff`), navy (`#04132a`/`#071f3d`), amarillo voltaje
(`#ffd21a`), verde/rojo de estado. Fuentes Space Grotesk / Manrope / Space Mono.
Componente de iconos SVG `ek-icon`.

### Tienda (storefront) — 16 páginas
Inicio, Tienda (catálogo con filtros + paginación), Producto (galería + tabs),
Búsqueda, Destacados, Favoritos, Carrito, **Checkout real** (crea el pedido),
Confirmación, Cuenta (perfil/pedidos/direcciones), Acceso (login/registro),
Blog, Artículo, FAQ, Nosotros, Contacto.

- **Carrito** y **Favoritos**: estado local con signals + `localStorage`.
- **Checkout real**: sincroniza el carrito con `/cart`, llama a `/orders/checkout`
  (con cupón opcional) y redirige a `/confirmacion?folio=`.
- **Menú de navegación**: el header lee `/menu` desde la API (gestionable en el panel).

### Panel de administración (`/admin`) — por rol
Login de personal, layout con menú filtrado por rol, y secciones:
Dashboard, **Centro de control** (SUPER), Pedidos, Productos, Clientes, Cupones,
**Reportes** (gráficas CSS/SVG, demo), CFDI (con modal de cancelación 01–04),
Integraciones + Métodos de pago, Sesiones, Auditoría, **Menú/Navegación**,
Usuarios y permisos, Perfil.

---

## 4. Puesta en marcha

### Requisitos
Node.js 20+, pnpm, PostgreSQL 14+.

### Backend
```bash
cd electric-kar
pnpm install
cp .env.example .env           # configura DATABASE_URL y JWT_SECRET
pnpm prisma:generate
pnpm prisma:migrate            # crea las tablas
pnpm db:seed                   # datos de ejemplo
pnpm start                     # http://localhost:3000/api  (Swagger en /docs)
```

> Conexión usada en desarrollo: PostgreSQL local por **socket Unix (peer auth)**:
> `DATABASE_URL="postgresql://USUARIO@localhost:5432/electrickar_db?host=/var/run/postgresql&schema=public"`

### Frontend
```bash
cd electric-kar-front
pnpm install
pnpm start                     # http://localhost:4200
```

### Credenciales del seed
- **Panel**: `admin@electrick-kar.mx` / `admin123` (rol SUPER)
- **Tienda**: `cliente@example.com` / `cliente123`
- **Cupón demo**: `DEMO10` (10%)

---

## 5. Estado y pendientes

**Funcional y operativo** para desarrollo/demo (tienda + panel + BBDD).

Pendiente (requiere **proveedores externos**):
- Pasarela de pago real (el checkout crea el pedido pero no cobra).
- **Timbrado CFDI** real (hoy **simulado**, UUID local) — necesita un PAC.
- **Envíos/guías** de paqueterías (Estafeta/DHL…).
- Correos de confirmación (SMTP / servicio de email).

Pendiente de "hardening" para producción:
- Cambiar `JWT_SECRET` y contraseñas del seed.
- PostgreSQL por TCP con contraseña (no socket).
- Fuentes locales (hoy Google Fonts CDN), Docker, rate-limiting.

### Pruebas
- **Backend** (`electric-kar`, Jest): pruebas unitarias de la lógica de negocio
  con `PrismaService` simulado (sin BD): checkout (IVA incluido, stock, cupones,
  folio), validación de cupones, autenticación (registro/login/recuperación),
  `RolesGuard` y catálogo de productos (paginación/filtros/errores Prisma).
  Ejecuta con `pnpm test` (cobertura: `pnpm test:cov`).
  > Requiere `pnpm prisma:generate` antes (el cliente vive en `src/generated`).
- **Frontend** (`electric-kar-front`, Angular + Vitest): pruebas del
  `CartService` (signals + `localStorage`). Ejecuta con `pnpm test`.

Datos demo señalados como tal: Reportes (desgloses por categoría/método de pago),
métricas técnicas del Centro de control, contenido de Blog/FAQ/Nosotros/Contacto.

---

## 6. Referencias
- `electric-kar/recursos/README.md` — visión y diseño del prototipo.
- `electric-kar/recursos/CATALOGO-DATOS.md` — diccionario de datos.
- `electric-kar/recursos/CATALOGO-DATOS-POR-ROL.md` — matriz de permisos por rol.

🤖 Generado con [Claude Code](https://claude.com/claude-code)
