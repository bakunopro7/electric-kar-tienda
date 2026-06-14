# Guía de instalación — electrick-Kar

Instalación y puesta en marcha del proyecto en un entorno de **desarrollo local**. El repositorio
es un monorepo con dos proyectos independientes: el **backend** (`electric-kar/`) y el **frontend**
(`electric-kar-front/`).

---

## 1. Requisitos previos

| Herramienta | Versión | Notas |
|-------------|---------|-------|
| **Node.js** | 20.19+ o 22+ | Requerido por Angular 21 y NestJS 11 |
| **pnpm** | 9+ | Gestor de paquetes de ambos proyectos |
| **PostgreSQL** | 14+ | Base de datos |
| **Git** | — | Para clonar el repositorio |

Verifica las versiones:

```bash
node -v
pnpm -v
psql --version
```

Si no tienes pnpm:

```bash
npm install -g pnpm
```

---

## 2. Clonar el repositorio

```bash
git clone <URL-del-repositorio> tiendaOnline
cd tiendaOnline
```

---

## 3. Base de datos

Crea una base de datos PostgreSQL vacía para el proyecto:

```bash
createdb electric_kar
```

Toma nota de la cadena de conexión; la usarás en `DATABASE_URL`. Formato típico:

```
postgresql://USUARIO:CONTRASEÑA@localhost:5432/electric_kar?schema=public
```

---

## 4. Backend (`electric-kar/`)

```bash
cd electric-kar
```

### 4.1. Variables de entorno

Copia la plantilla y completa los valores:

```bash
cp .env.example .env
```

Variables principales:

| Variable | Descripción | Obligatoria |
|----------|-------------|:-----------:|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | ✅ |
| `PORT` | Puerto de la API (por defecto `3000`) | — |
| `NODE_ENV` | `development` / `production` | — |
| `JWT_SECRET` | Secreto para firmar los tokens JWT | ✅ |
| `JWT_EXPIRES_IN` | Vigencia del token (p. ej. `7d`) | — |
| `EMISOR_RFC` / `EMISOR_REGIMEN` / `IVA_TASA` | Datos fiscales del emisor (CFDI 4.0) | para CFDI |
| `APP_FRONT_URL` | URL del frontend (retornos de Stripe) | — |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Claves de Stripe (modo prueba) | para pagos |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | para login con Google |

> Sin `STRIPE_SECRET_KEY` la API arranca igual, pero el checkout no completa el pago.
> Sin `GOOGLE_CLIENT_ID` el acceso por correo/contraseña sigue funcionando.

### 4.2. Instalar dependencias

```bash
pnpm install
```

### 4.3. Preparar la base de datos

```bash
pnpm prisma:generate     # genera el cliente Prisma
pnpm prisma:deploy       # aplica las migraciones existentes
pnpm db:seed             # carga datos de ejemplo y credenciales demo
```

> Para crear **nuevas** migraciones durante el desarrollo se usa `pnpm prisma:migrate`
> (`prisma migrate dev`). `prisma:deploy` solo aplica las ya existentes y es el indicado para
> levantar el proyecto por primera vez o en CI.

### 4.4. Arrancar la API

```bash
pnpm start:dev           # modo watch
```

La API queda en `http://localhost:3000/api` y la documentación Swagger en
`http://localhost:3000/docs`.

---

## 5. Frontend (`electric-kar-front/`)

En **otra terminal**:

```bash
cd electric-kar-front
pnpm install
pnpm start
```

La tienda queda en `http://localhost:4200` y el panel en `http://localhost:4200/admin`.

> El frontend consume la API en `http://localhost:3000`. Asegúrate de tener el backend corriendo
> para ver datos reales.

---

## 6. Verificación

Con ambos servidores arriba:

1. **API:** `curl http://localhost:3000/api/health` debe responder `200`.
2. **Swagger:** abre `http://localhost:3000/docs`.
3. **Tienda:** abre `http://localhost:4200`.
4. **Panel:** abre `http://localhost:4200/admin` e inicia sesión con
   `admin@electrick-kar.mx` / `admin123`.

---

## 7. Producción

### Backend

```bash
cd electric-kar
pnpm build
pnpm prisma:deploy
pnpm start:prod          # node dist/main
```

### Frontend (SSR)

```bash
cd electric-kar-front
pnpm build
pnpm start:prod          # node dist/electric-kar-front/server/server.mjs
```

El build de SSR genera un servidor Node (`server.mjs`) que sirve la aplicación renderizada en
servidor. Configura el puerto con la variable `PORT` si lo necesitas:

```bash
PORT=4200 node dist/electric-kar-front/server/server.mjs
```

---

## 8. Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| La API no conecta a la base | `DATABASE_URL` incorrecta o PostgreSQL apagado | Verifica la cadena y que el servicio esté corriendo |
| `prisma migrate dev` se cuelga | Es un comando interactivo | Usa `pnpm prisma:deploy` para aplicar migraciones existentes |
| El frontend muestra páginas sin datos | El backend no está corriendo | Levanta la API en `:3000` antes de abrir la tienda |
| El checkout no avanza al pago | `STRIPE_SECRET_KEY` vacío | Configura una clave de Stripe en modo prueba |
| El puerto 3000/4200 está ocupado | Otro proceso lo usa | Libera el puerto (`fuser -k 3000/tcp`) y reinicia |
