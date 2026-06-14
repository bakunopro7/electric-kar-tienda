# electrick-Kar

Tienda en línea **full-stack** con **panel de administración** para **electrick-Kar**, un comercio
de refacciones y accesorios eléctricos automotrices (baterías, iluminación LED, audio, alternadores,
alarmas, cableado, sensores). Enfocado en **México**: facturación **CFDI 4.0 / SAT**, pasarela de
pago **Stripe** y catálogo en español.

> **Estado:** en desarrollo (v0.0.1). El stack corre de punta a punta en local. Para conocer la
> preparación de cara a pruebas con usuarios, ver [Estado del proyecto](#estado-del-proyecto).

---

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Características](#características)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Scripts útiles](#scripts-útiles)
- [Pruebas](#pruebas)
- [Datos de ejemplo (seed)](#datos-de-ejemplo-seed)
- [Estado del proyecto](#estado-del-proyecto)
- [Documentación adicional](#documentación-adicional)

---

## Arquitectura

El repositorio es un **monorepo** con dos proyectos independientes (cada uno con su propio
`package.json` y gestionado con **pnpm**):

```
tiendaOnline/
├── electric-kar/        # Backend — API REST (NestJS 11 + Prisma 7 + PostgreSQL)
└── electric-kar-front/  # Frontend — Angular 21 SSR + Tailwind v4 (tienda + panel)
```

- **Backend:** `http://localhost:3000/api` · documentación Swagger en `/docs`.
- **Frontend:** `http://localhost:4200` (tienda pública) y `/admin` (panel administrativo).

El **frontend** sigue una **Screaming Architecture** orientada a canal: dos contextos delimitados
en la raíz — `tienda/` (storefront) y `panel/` (back-office) — con los dominios anidados dentro de
cada uno, y `core/`, `shared/`, `layout/` como transversales. Se renderiza en servidor (SSR) sobre
un servidor Express.

El **backend** es una API REST modular de NestJS: un módulo por dominio (productos, pedidos,
carrito, cupones, CFDI, pagos, integraciones, etc.), con Prisma como ORM sobre PostgreSQL.

---

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Angular 21 (standalone + signals), SSR con `@angular/ssr` + Express, Tailwind CSS v4, Vitest (unit), Playwright (e2e) |
| **Backend** | NestJS 11, Prisma 7 (`@prisma/adapter-pg`), JWT + Passport, `class-validator`, Swagger, Jest |
| **Base de datos** | PostgreSQL |
| **Pagos** | Stripe (tarjeta, OXXO) |
| **Facturación** | CFDI 4.0 / SAT (datos del emisor configurables) |
| **Autenticación** | JWT propio + Login con Google (OAuth) |
| **Tooling** | pnpm, TypeScript, ESLint, Prettier, GitHub Actions (CI) |

---

## Estructura del repositorio

```
tiendaOnline/
├── electric-kar/                 # Backend NestJS
│   ├── prisma/                   # schema.prisma, migraciones, seed.ts
│   ├── src/                      # módulos de la API (auth, products, orders, cart, cfdi, …)
│   ├── test/                     # pruebas e2e y funcionales (Jest)
│   ├── recursos/                 # prototipo de referencia + catálogos de datos
│   └── .env.example              # plantilla de variables de entorno
├── electric-kar-front/           # Frontend Angular
│   └── src/app/
│       ├── tienda/               # contexto storefront (catalogo, carrito, checkout, cuenta, contenido)
│       ├── panel/                # contexto back-office (pedidos, clientes, cupones, facturacion, …)
│       ├── core/                 # servicios transversales (auth, http, storage, theme, models)
│       ├── shared/               # componentes/pipes reutilizables
│       └── layout/               # header, footer
├── openspec/                     # artefactos de Spec-Driven Development (specs y cambios)
├── DOCUMENTACION.md              # documentación técnica detallada
├── INSTALL.md                    # guía de instalación paso a paso
└── CHANGELOG.md                  # historial de cambios
```

---

## Características

**Tienda (storefront)**
- Catálogo con categorías y marcas, búsqueda y productos destacados.
- Ficha de producto, carrito y proceso de checkout.
- Cupones de descuento.
- Cuenta de cliente: registro, acceso (correo o Google), recuperación de contraseña, favoritos,
  direcciones y historial de pedidos.
- Contenido editorial: blog, FAQ, nosotros, contacto.
- Renderizado en servidor (SSR) para SEO y primera carga rápida.

**Panel administrativo (back-office)**
- Gestión de pedidos, productos, clientes y usuarios.
- Cupones, facturación **CFDI**, integraciones, reportes y dashboard.
- Centro de control, sesiones y auditoría de actividad.
- Control de acceso por **roles** (`SUPER`, `ADMIN`, `VENDEDOR`, `CONTADOR`).

---

## Requisitos

- **Node.js** 20.19+ o 22+
- **pnpm** 9+
- **PostgreSQL** 14+

---

## Puesta en marcha

La guía completa está en **[INSTALL.md](INSTALL.md)**. Versión resumida:

```bash
# 1) Backend
cd electric-kar
cp .env.example .env            # y completar DATABASE_URL, JWT_SECRET, etc.
pnpm install
pnpm prisma:generate
pnpm prisma:deploy              # aplica migraciones
pnpm db:seed                    # datos de ejemplo
pnpm start:dev                  # API en http://localhost:3000/api

# 2) Frontend (en otra terminal)
cd electric-kar-front
pnpm install
pnpm start                      # tienda en http://localhost:4200
```

---

## Scripts útiles

**Backend (`electric-kar/`)**

| Comando | Descripción |
|---------|-------------|
| `pnpm start:dev` | API en modo watch |
| `pnpm start:prod` | API desde el build (`node dist/main`) |
| `pnpm build` | Compila la API |
| `pnpm prisma:generate` | Genera el cliente Prisma |
| `pnpm prisma:deploy` | Aplica migraciones (`migrate deploy`) |
| `pnpm prisma:studio` | Explorador visual de la base de datos |
| `pnpm db:seed` | Carga datos de ejemplo |
| `pnpm test` | Pruebas unitarias (Jest) |

**Frontend (`electric-kar-front/`)**

| Comando | Descripción |
|---------|-------------|
| `pnpm start` | Servidor de desarrollo (`http://localhost:4200`) |
| `pnpm build` | Build de producción (SSR) |
| `pnpm start:prod` | Sirve el build SSR (`node dist/.../server/server.mjs`) |
| `pnpm test` | Pruebas unitarias (Vitest) |
| `pnpm e2e` | Pruebas end-to-end (Playwright) |

---

## Pruebas

- **Backend:** Jest — unitarias (`pnpm test`), e2e (`pnpm test:e2e`) y funcionales
  (`pnpm test:functional`).
- **Frontend:** Vitest para unitarias (`pnpm test`) y Playwright para e2e (`pnpm e2e`).
- **CI:** GitHub Actions ejecuta backend, frontend y e2e en cada cambio.

---

## Datos de ejemplo (seed)

`pnpm db:seed` crea credenciales de demostración:

| Acceso | Correo | Contraseña | Rol |
|--------|--------|-----------|-----|
| Panel | `admin@electrick-kar.mx` | `admin123` | `SUPER` |
| Tienda | `cliente@example.com` | `cliente123` | cliente |

Cupón de demostración: **`DEMO10`**.

> Estas credenciales son solo para desarrollo. No las uses en producción.

---

## Estado del proyecto

El stack **compila y arranca de punta a punta** en local (API + tienda + panel + base de datos).
Para una **prueba de usabilidad con usuarios reales** todavía conviene cubrir:

- **Catálogo de ejemplo más amplio** — el seed actual es mínimo; para evaluar búsqueda, filtros y
  navegación por categorías hace falta volumen de productos.
- **Stripe configurado** — sin `STRIPE_SECRET_KEY` el checkout no completa el pago.
- **Entorno desplegado** — para invitar a testers externos se necesita una URL accesible
  (staging o túnel), no `localhost`.

---

## Documentación adicional

- **[DOCUMENTACION.md](DOCUMENTACION.md)** — documentación técnica detallada (arquitectura, módulos,
  modelo de datos).
- **[INSTALL.md](INSTALL.md)** — instalación paso a paso.
- **[CHANGELOG.md](CHANGELOG.md)** — historial de cambios.
- **`openspec/`** — especificaciones y cambios bajo Spec-Driven Development.

---

## Licencia

UNLICENSED — proyecto privado. Todos los derechos reservados.
