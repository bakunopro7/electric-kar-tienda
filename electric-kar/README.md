# electric-kar — API de tienda online

API REST construida con **NestJS 11**, **Prisma 7** (PostgreSQL) y **pnpm**.

## Stack

- **NestJS 11** + TypeScript
- **Prisma 7** con driver adapter `@prisma/adapter-pg` (PostgreSQL)
- **JWT** (`@nestjs/jwt` + Passport) para autenticación
- **class-validator** + `ValidationPipe` global
- **Swagger / OpenAPI** en `/docs`

## Modelo de datos

El esquema (`prisma/schema.prisma`) está alineado con `recursos/CATALOGO-DATOS.md`
y usa **nombres en español**. Entidades: `Usuario`, `RegistroActividad`, `Sesion`,
`Cliente`, `Direccion`, `Categoria`, `Marca`, `Producto`, `Carrito`/`CarritoItem`,
`Pedido`/`PedidoLinea`, `Cupon`, `Cfdi`/`CfdiLinea`/`ComplementoPago`,
`MetodoPago`, `ConfigPickup`, `Integracion`.

### Dos tipos de principal (autenticación)

- **`Cliente`** — comprador de la tienda. Hace `register`/`login`, usa carrito y pedidos.
- **`Usuario`** — personal del panel, con `Rol`: `SUPER` / `ADMIN` / `VENDEDOR` / `CONTADOR`.

Un único JWT los distingue con el claim `tipo` (`cliente` | `usuario`). Guards:
`ClienteGuard` (solo clientes) y `RolesGuard` (solo personal con el rol requerido).

## Módulos (estado actual)

| Módulo          | Ruta base          | Descripción                                                  |
| --------------- | ------------------ | ------------------------------------------------------------ |
| `auth`          | `/api/auth`        | `register`/`login` (cliente), `staff/login`, `me`            |
| `users`         | `/api/users`       | Gestión del personal del panel (solo `SUPER`)                |
| `clientes`      | `/api/clientes`    | Perfil y direcciones (cliente); listado/segmento (personal)  |
| `categories`    | `/api/categories`  | CRUD de categorías (escritura: `ADMIN`/`SUPER`)              |
| `marcas`        | `/api/marcas`      | CRUD de marcas (escritura: `ADMIN`/`SUPER`)                  |
| `products`      | `/api/products`    | CRUD de productos con filtros y paginación                   |
| `cart`          | `/api/cart`        | Carrito del cliente                                          |
| `orders`        | `/api/orders`      | Checkout e historial (cliente); gestión (personal)          |
| `cupones`       | `/api/cupones`     | CRUD (personal) + `validate` (cliente)                       |
| `cfdi`          | `/api/cfdi`        | Emitir / timbrar* / cancelar / REP (personal fiscal)        |
| `integraciones` | `/api/integraciones` | Pasarela/PAC/paquetería (credenciales: `SUPER`)            |
| `metodos-pago`  | `/api/metodos-pago` | Configuración de métodos de pago (`ADMIN`/`SUPER`)          |
| `config-pickup` | `/api/config-pickup` | Configuración de recoger en tienda (`ADMIN`/`SUPER`)       |
| `auditoria`     | `/api/auditoria`   | Bitácora de actividad (`SUPER`)                              |
| `sesiones`      | `/api/sesiones`    | Sesiones activas del personal (`SUPER`)                      |
| `health`        | `/api/health`      | Health check                                                 |

> \* El **timbrado de CFDI es simulado** (genera un UUID local); el real requiere
> integrar un PAC autorizado. El cálculo de IVA usa `IVA_TASA` del `.env`.

### Auditoría y sesiones (enfoque mixto)

- Un **interceptor global** (`AuditoriaInterceptor`) registra automáticamente
  toda escritura (POST/PATCH/PUT/DELETE) hecha por **personal del panel**.
- Acciones críticas se registran **manualmente** con descripción precisa y se
  excluyen del interceptor con `@SkipAudit()`:
  - **Login de personal** → tipo `ACCESO` + crea una `Sesion` activa.
  - **CFDI** (emitir/timbrar/cancelar/REP) → tipo `FISCAL`.
- Las acciones de **clientes** no se auditan (la bitácora es del personal).

## Requisitos

- Node.js 20+ (probado con 24)
- pnpm
- PostgreSQL 14+

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
#    → edita DATABASE_URL con tus credenciales de PostgreSQL
#    → cambia JWT_SECRET por un valor largo y aleatorio

# 3. Generar el cliente de Prisma
pnpm prisma:generate

# 4. Crear la base de datos y aplicar el esquema
pnpm prisma:migrate          # primera migración (entorno dev)

# 5. (Opcional) Cargar datos de ejemplo
pnpm db:seed                 # crea usuario admin y cliente de ejemplo

# 6. Arrancar en desarrollo
pnpm start:dev
```

- API:     http://localhost:3000/api
- Swagger:  http://localhost:3000/docs

## Scripts útiles

```bash
pnpm start:dev        # desarrollo con watch
pnpm build            # compila a dist/
pnpm start:prod       # node dist/main (requiere build previo)
pnpm test             # tests unitarios
pnpm prisma:studio    # explorador visual de la BBDD
pnpm prisma:migrate   # crear/aplicar migraciones (dev)
pnpm prisma:deploy    # aplicar migraciones (producción)
```

## Notas sobre Prisma 7

- El cliente se genera en `src/generated/prisma` (ignorado en git) en formato
  CommonJS (`moduleFormat = "cjs"`) para ser compatible con la build de NestJS.
- La conexión usa el **driver adapter** `@prisma/adapter-pg`; la URL se lee de
  `DATABASE_URL` (vía `prisma.config.ts` para la CLI y `ConfigService` en runtime).
- Tras cambiar `prisma/schema.prisma`, ejecuta `pnpm prisma:generate`.

## Autenticación

- **Cliente:** `POST /api/auth/register` o `POST /api/auth/login` → `accessToken` (tipo `cliente`).
- **Personal:** `POST /api/auth/staff/login` → `accessToken` (tipo `usuario`, con `rol`).
- Envía el token en peticiones protegidas: `Authorization: Bearer <accessToken>`.
- Endpoints de carrito/checkout requieren un **cliente**; los de gestión, un
  **usuario** con el rol adecuado.

Datos del seed (`pnpm db:seed`):
- Panel:  `admin@electrick-kar.mx` / `admin123` (rol `SUPER`)
- Tienda: `cliente@example.com` / `cliente123`
