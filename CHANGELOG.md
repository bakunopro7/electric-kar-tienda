# Changelog

Todos los cambios relevantes de **electrick-Kar** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto se
encuentra en fase previa al versionado semántico (v0.0.1, sin etiquetas de versión todavía). Las
secciones se ordenan de más reciente a más antigua.

---

## [No publicado]

### Añadido
- Documentación del proyecto: `README.md`, guía de instalación `INSTALL.md` y este `CHANGELOG.md`.
- Toggle de visibilidad de contraseña y mensajes de error por estado HTTP en el acceso al panel
  (PR #18, en revisión).

### Cambiado
- Limpieza de código muerto: eliminado el componente `placeholder` sin uso y la carpeta `admin/`
  heredada (PR #19, en revisión).

---

## 2026-06-11

### Cambiado
- **Frontend reorganizado a Screaming Architecture orientada a canal.** `src/app` pasa de una
  estructura por tipo técnico (`pages/`, `admin/`) a dos contextos delimitados — `tienda/`
  (storefront) y `panel/` (back-office) — con los dominios anidados dentro de cada uno y
  `core/`/`shared/`/`layout/` como transversales. Movimiento puramente estructural, sin cambios de
  comportamiento; rutas, títulos y guards preservados. (#14, #15)

### Añadido
- Alias de rutas de TypeScript (`@core`, `@shared`, `@layout`, `@tienda`, `@panel`) en `tsconfig`,
  resolubles tanto en el build de Angular como en Vitest.

---

## 2026-06-09

### Añadido
- Pruebas funcionales del backend con Jest. (#9)
- Endurecimiento de la validación de entradas: límites de longitud en DTOs, normalización de
  correos y `VarChar` en columnas clave de la base de datos. (#7)
- Paginación en los listados del panel (pedidos, clientes, CFDI) y en estadísticas/reportes.
  (#2, #4)
- Integración continua con GitHub Actions (backend, frontend y e2e). (#6)

---

## Versión inicial

### Añadido
- **Storefront con renderizado en servidor (SSR)** sobre Angular 21 + Express con hidratación de
  cliente, para SEO y primera carga rápida. (#1)
- **API REST** de NestJS 11 + Prisma 7 + PostgreSQL con módulos por dominio: catálogo (productos,
  categorías, marcas), carrito, pedidos, cupones, clientes y usuarios.
- **Autenticación** JWT propia y login con Google (OAuth).
- **Facturación CFDI 4.0 / SAT** y **pagos con Stripe** (tarjeta, OXXO).
- **Panel administrativo** con control de acceso por roles (`SUPER`, `ADMIN`, `VENDEDOR`,
  `CONTADOR`): pedidos, productos, clientes, usuarios, cupones, integraciones, reportes, sesiones
  y auditoría.
- Tienda pública: ficha de producto, búsqueda, destacados, favoritos, cuenta de cliente y contenido
  editorial (blog, FAQ, nosotros, contacto).
