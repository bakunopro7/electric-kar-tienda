# CLAUDE.md — electrick-Kar

Tienda en línea full-stack + panel de administración para **electrick-Kar** (refacciones y
accesorios eléctricos/electrónicos automotrices). Enfoque México: CFDI 4.0 / SAT, Stripe, español.

## Estructura (monorepo, dos proyectos pnpm independientes)

```
electric-kar/         Backend  — NestJS 11 + Prisma 7 (adapter-pg) + PostgreSQL
electric-kar-front/   Frontend — Angular 21 SSR (Express) + Tailwind v4
openspec/             Spec-Driven Development: specs/ (vigentes) y changes/ (en curso + archive/)
docker-compose.yml    PostgreSQL 16 (:5432) + Typesense 27.1 (:8108)
```

No hay workspace raíz: cada proyecto tiene su propio `package.json` y `pnpm-lock.yaml`.
Ejecuta siempre los comandos **dentro** de `electric-kar/` o `electric-kar-front/`.

## Comandos

Infraestructura (raíz): `docker compose up -d`

Backend (`electric-kar/`):

| Comando | Uso |
|---|---|
| `pnpm start:dev` | API en watch (`/api`, Swagger en `/docs`) |
| `pnpm build` | Compilar |
| `pnpm test` | Unitarias (Jest, `src/**/*.spec.ts`) |
| `pnpm test:functional` | Funcionales contra PostgreSQL real (`test/functional`, `--runInBand`) |
| `pnpm test:e2e` | E2E (`test/*.e2e-spec.ts`) |
| `pnpm prisma:generate` | Generar cliente (obligatorio tras clonar o cambiar el schema) |
| `pnpm prisma:deploy` | Aplicar migraciones existentes |
| `pnpm prisma:migrate` | Crear migración nueva (interactivo) |
| `pnpm db:seed` | Datos demo |
| `pnpm search:reindex` | Reindexar Typesense (`-- --rebuild` para podar huérfanos) |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |

Frontend (`electric-kar-front/`):

| Comando | Uso |
|---|---|
| `pnpm start` | Dev server en `:4200` (panel en `/admin`) |
| `pnpm build` | Build SSR |
| `pnpm test --watch=false` | Unitarias (Vitest) |
| `pnpm e2e` | Playwright (requiere API + SSR levantados) |

Bootstrap de un entorno nuevo: `prisma:generate → prisma:deploy → db:seed → search:reindex`.

## Detalles que no son obvios

- **Puerto de la API en desarrollo: 3100, no 3000.** `environment.development.ts` apunta a
  `http://localhost:3100/api` porque en Windows con Docker Desktop el 3000 cae en un rango
  reservado por WinNAT/Hyper-V. Levanta el backend con `PORT=3100`. README/INSTALL siguen
  diciendo 3000 (CI y producción sí usan 3000).
- **Cliente Prisma generado** en `electric-kar/src/generated/prisma` (ignorado por git, formato
  cjs). Sin `prisma:generate` no compila ni corren los tests.
- **Modelo de datos en español** (`Usuario`, `Cliente`, `Pedido`, `Producto`, `Cfdi`…): 25 modelos
  en `prisma/schema.prisma`.
- **Dos tipos de principal en el JWT** (claim `tipo`): `Cliente` (tienda) y `Usuario` (panel, con
  `Rol` = `SUPER` | `ADMIN` | `VENDEDOR` | `CONTADOR`). Guards: `JwtAuthGuard`, `ClienteGuard`,
  `RolesGuard`. Matriz de permisos: `electric-kar/recursos/CATALOGO-DATOS-POR-ROL.md`.
- **Auditoría:** un interceptor global registra toda escritura del personal; las acciones críticas
  se registran a mano y usan `@SkipAudit()`.
- **Precios con IVA incluido:** `iva = Σ(importe × tasa / (100 + tasa))`.
- **Typesense es un índice derivado**; la fuente de verdad es PostgreSQL. Se consulta siempre el
  alias `productos` a través del proxy `GET /api/products/search` (filtra `estado = PUBLICADO`).
  La `TYPESENSE_API_KEY` nunca debe llegar al navegador. Si Typesense no está, la búsqueda cae a
  PostgreSQL.
- **CFDI:** el timbrado va por **Facturapi** (`src/cfdi/facturapi/`, `FACTURAPI_MODE=test|live`).
  También existe el camino propio de XML + sellado con CSD (`src/cfdi/xml/`, `src/cfdi/csd/`, CSD
  cifrado con `CSD_MASTER_KEY`). Guía: `electric-kar/docs/facturacion-cfdi-csd-pac.md`.
- **Stripe:** el webhook necesita `rawBody` (activado en `main.ts`). Sin `STRIPE_SECRET_KEY` el
  checkout no completa el pago.
- **Frontend — Screaming Architecture por canal:** `src/app/tienda/` (storefront) y
  `src/app/panel/` (back-office), con dominios anidados (`<contexto>/<dominio>/<componente>/`), más
  `core/`, `shared/`, `layout/`. No crear carpetas `pages/` ni `admin/`. Contrato en
  `openspec/specs/frontend-architecture/spec.md`.
- **Imports con alias:** `@core/*`, `@shared/*`, `@layout/*`, `@tienda/*`, `@panel/*`.
- **Angular standalone + signals**; tokens de diseño en `src/styles.css` (`@theme`), modo oscuro
  por clase, iconos con `ek-icon`.
- **SSR:** cuidar el acceso a `window`/`localStorage` (carrito y favoritos viven en
  `localStorage`).
- `electric-kar/recursos/*.html` es el prototipo de referencia del diseño, no código de la app.

## Sistema de diseño de la tienda (móvil primero)

La mayoría del tráfico es móvil: diseñar y revisar primero a 375 px.

- Tokens y clases en `electric-kar-front/src/styles.css`. Usar los colores semánticos
  (`fondo`, `superficie`, `superficie-2`, `borde`, `texto`, `texto-suave`, `texto-tenue`, `marca`),
  que cambian solos entre claro y oscuro. No escribir pares `text-black/60 dark:text-white/60`.
- Amarillo voltaje (`btn-voltaje`) = la acción de compra principal de la pantalla, una sola.
  Azul (`btn-primary`, `text-marca`) = navegación, selección y acciones secundarias.
- Objetivos táctiles de 44 px: `btn`, `btn-lg`, `ek-icon-btn`, `ek-chip`, `ek-input`.
- Cifras (precios, cantidades) con `ek-num`; no usar `font-mono` en la tienda.
- Iconos solo con `<ek-icon>`; nada de emojis como iconos.
- Piezas compartidas: `ek-product-card`, `ek-qty` (cantidad), `ek-tab-bar` (navegación inferior en
  móvil), `.ek-seccion` + `.ek-enlace` (encabezado de sección), `.ek-scroll-x` (carrusel táctil),
  `.ek-barra-accion` (barra de compra fija en móvil), `.ek-skeleton` (carga).
- Estilo de impacto: titulares con `ek-titular` (Barlow Condensed itálica, mayúsculas), header siempre
  oscuro, `ek-corte` (esquina cortada), `ek-franja` (franja amarillo/negro), `ek-marcado` (resaltado).
- Movimiento (todo en `styles.css`, se apaga con `prefers-reduced-motion`): `ek-entra` (entrada del
  hero, escalonar con `--i`), directiva `ekReveal` (aparece al entrar en pantalla), `ek-cinta` (cinta
  continua; duplicar el contenido), `ek-vivo` (punto vivo), `ek-salto` (rebote del contador del
  carrito), `ek-tarjeta` (hover de tarjetas). El movimiento debe responder a algo (carga, scroll,
  acción o dato vivo); no animar por decorar.
- El servidor de desarrollo se arranca con `--no-hmr` (`tienda.bat`): con HMR quedaban plantillas
  viejas en el navegador después de editar componentes.
- Toda página interior abre con `<ek-page-head titulo subtitulo [migas]>` (banda oscura a todo el
  ancho, ruta y titular). No crear cabeceras propias por página.
- `ek-sangrado` rompe el contenedor central y ocupa todo el ancho de la ventana; el contenido interno
  se centra con `mx-auto max-w-7xl px-4`. No usar `-mx-4` para bandas (en pantallas anchas queda encajonado).
- Menú principal en píldoras: `ek-pildora` / `ek-pildora-activa`. Bloques de ayuda o cierre:
  `ek-corte rounded-ek-lg bg-navy-950 text-white`.
- Los e2e dependen de: `a[aria-label="Carrito"] span` (único, en el header), botones con el texto
  "Añadir al carrito", "Salir" y "Pagar". No duplicar ese `aria-label` ni cambiar esos textos.

## Flujo de trabajo

- Rama de integración: **`develop`**. `main` está muy atrasada; no basarse en ella.
- Ramas `feat/…`, `fix/…`, `chore/…`, `docs/…`, `style/…` → PR a `develop`.
- Commits convencionales con scope, en español: `feat(cfdi): …`, `fix(panel): …`.
- CI (GitHub Actions, Node 22, pnpm 11): backend (jest + build), frontend (vitest + build),
  backend funcional y e2e Playwright. Todo debe quedar en verde.
- Los cambios grandes se planean en `openspec/changes/<nombre>/` (proposal, design, spec, tasks)
  y al terminar se archivan en `openspec/changes/archive/`, promoviendo el spec a `openspec/specs/`.
- Nunca subir `.env` ni llaves (Stripe, Facturapi, CSD, Google).

## Credenciales demo (solo desarrollo, creadas por el seed)

- Panel: `admin@electrick-kar.mx` / `admin123` (SUPER)
- Tienda: `cliente@example.com` / `cliente123`
- Cupón: `DEMO10`

## Documentación

`README.md` (visión general y Typesense), `INSTALL.md` (instalación), `DOCUMENTACION.md`
(arquitectura; **desactualizada** en modelo de datos, pagos y CFDI), `CHANGELOG.md` (llega hasta
2026-06-11), `electric-kar/docs/` (CFDI y salud de la BD).
