# electrick-Kar — Frontend (tienda)

Storefront de **electrick-Kar** construido con **Angular 21** (standalone + signals),
**Tailwind CSS v4** y el sistema de diseño de la marca (azul eléctrico + amarillo
voltaje, Space Grotesk/Manrope, modo oscuro persistente).

Consume la API NestJS del proyecto `electric-kar/` (por defecto `http://localhost:3000/api`).

## Requisitos

- Node.js 20+
- pnpm
- La API (`electric-kar`) corriendo para ver datos reales

## Puesta en marcha

```bash
pnpm install
pnpm start            # ng serve → http://localhost:4200
```

> La URL de la API se configura en `src/environments/environment.ts`.
> El backend ya tiene CORS habilitado, así que el front (4200) puede llamarlo (3000).

## Scripts

```bash
pnpm start     # servidor de desarrollo (ng serve)
pnpm build     # build de producción → dist/
pnpm test      # tests unitarios
```

## Estructura

```
src/app/
├── core/                 # servicios y modelos (sin UI)
│   ├── models.ts         # interfaces alineadas con la API
│   ├── productos.service.ts
│   ├── categorias.service.ts
│   ├── auth.service.ts   # registro/login de cliente (JWT en localStorage)
│   ├── cart.service.ts   # carrito local (signals + localStorage)
│   ├── theme.service.ts  # modo oscuro persistente
│   └── auth.interceptor.ts
├── layout/               # header y footer
├── shared/               # product-card, money pipe
└── pages/                # home, tienda, producto, carrito, checkout, acceso, cuenta
```

## Páginas

| Ruta            | Página                                              |
| --------------- | --------------------------------------------------- |
| `/`             | Inicio (hero + destacados desde la API)             |
| `/tienda`       | Catálogo con filtro por categoría, búsqueda y paginación |
| `/producto/:id` | Detalle de producto + añadir al carrito             |
| `/carrito`      | Carrito (cantidades, total)                         |
| `/checkout`     | Datos de envío + resumen (pago/pedido pendiente)    |
| `/acceso`       | Login / registro de cliente                         |
| `/cuenta`       | Perfil + mis pedidos                                |

## Sistema de diseño (Tailwind v4)

Los tokens viven en `src/styles.css` (`@theme`):
colores `azul-700/500`, `navy-900/800`, `voltaje`, `exito`, `peligro`;
fuentes `font-display`/`font-sans`/`font-mono`; clases `.btn-primary`,
`.btn-voltaje`, `.btn-outline`, `.card`. Modo oscuro por clase `.dark`.

## Pendiente
- **Checkout real**: sincronizar el carrito local con `/cart` y llamar a
  `/orders/checkout` (hoy es un esqueleto).
- Páginas adicionales del prototipo (favoritos, blog, FAQ, confirmación).
- Fuentes locales (ahora se cargan desde Google Fonts).
