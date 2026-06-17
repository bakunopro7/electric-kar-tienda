// Modelos del frontend, alineados con las respuestas de la API NestJS.
// Nota: los campos Decimal de Prisma se serializan como `string` en JSON.

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string | null;
}

export interface Marca {
  id: string;
  nombre: string;
  slug: string;
}

export interface Feature {
  id: string;
  icono: string;
  titulo: string;
  texto: string;
  orden: number;
}

export interface Promo {
  id: string;
  badge: string;
  titulo: string;
  texto: string;
  descuento: string;
  /** ISO-8601; base de la cuenta regresiva. */
  fechaFin: string;
  ctaTexto: string;
  ctaUrl: string;
}

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  descripcion?: string | null;
  descripcionCorta?: string | null;
  precio: string;
  precioComparativo?: string | null;
  existencias: number;
  imagenes: string[];
  estado: string;
  categoriaId?: string | null;
  marcaId?: string | null;
  categoria?: Categoria | null;
  marca?: Marca | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface ClienteAuth {
  id: string;
  correo: string;
}

export interface AuthResponse {
  accessToken: string;
  cliente: ClienteAuth;
}
