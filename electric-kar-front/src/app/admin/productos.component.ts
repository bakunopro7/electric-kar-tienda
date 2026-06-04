import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAuthService } from '../core/admin-auth.service';
import { AdminService } from '../core/admin.service';
import { Categoria, Marca, Producto } from '../core/models';
import { MoneyPipe } from '../shared/money.pipe';

interface ProductoForm {
  nombre: string;
  sku: string;
  precio: number | null;
  existencias: number | null;
  categoriaId: string;
  marcaId: string;
  descripcion: string;
  estado: string;
}

const VACIO: ProductoForm = {
  nombre: '', sku: '', precio: null, existencias: 0,
  categoriaId: '', marcaId: '', descripcion: '', estado: 'BORRADOR',
};

@Component({
  selector: 'ek-admin-productos',
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-xl font-bold">Productos</h2>
      @if (puedeEscribir()) {
        <button type="button" class="btn-primary text-sm" (click)="nuevo()">Nuevo producto</button>
      }
    </div>

    @if (mostrarForm()) {
      <form (ngSubmit)="guardar()" class="card mt-4 grid gap-3 sm:grid-cols-2">
        <input [(ngModel)]="form.nombre" name="nombre" placeholder="Nombre" required class="ek-input" />
        <input [(ngModel)]="form.sku" name="sku" placeholder="SKU" required class="ek-input" />
        <input [(ngModel)]="form.precio" name="precio" type="number" step="0.01" placeholder="Precio" required class="ek-input" />
        <input [(ngModel)]="form.existencias" name="existencias" type="number" placeholder="Existencias" class="ek-input" />
        <select [(ngModel)]="form.categoriaId" name="categoriaId" class="ek-input">
          <option value="">— Categoría —</option>
          @for (c of categorias(); track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }
        </select>
        <select [(ngModel)]="form.marcaId" name="marcaId" class="ek-input">
          <option value="">— Marca —</option>
          @for (m of marcas(); track m.id) { <option [value]="m.id">{{ m.nombre }}</option> }
        </select>
        <select [(ngModel)]="form.estado" name="estado" class="ek-input">
          <option value="BORRADOR">Borrador</option>
          <option value="PUBLICADO">Publicado</option>
          <option value="PROGRAMADO">Programado</option>
        </select>
        <input [(ngModel)]="form.descripcion" name="descripcion" placeholder="Descripción" class="ek-input" />
        @if (error()) { <p class="text-sm text-peligro sm:col-span-2">{{ error() }}</p> }
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : (editId() ? 'Guardar cambios' : 'Crear') }}</button>
          <button type="button" class="btn-outline" (click)="mostrarForm.set(false)">Cancelar</button>
        </div>
      </form>
    }

    <div class="mt-4">
      <input [(ngModel)]="search" (keyup.enter)="buscar()" placeholder="Buscar por nombre o SKU…" class="ek-input w-full max-w-sm" />
    </div>

    <div class="card mt-3 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (productos().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin productos.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10">
              <th class="py-2">Producto</th><th>SKU</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (p of productos(); track p.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-semibold">{{ p.nombre }}</td>
                <td class="font-mono text-xs">{{ p.sku }}</td>
                <td class="text-black/60 dark:text-white/60">{{ p.categoria?.nombre || '—' }}</td>
                <td class="font-mono">{{ p.precio | money }}</td>
                <td><span [class.text-peligro]="p.existencias <= 5">{{ p.existencias }}</span></td>
                <td><span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="p.estado === 'PUBLICADO' ? 'bg-exito/15 text-exito' : 'bg-black/10 dark:bg-white/10'">{{ p.estado }}</span></td>
                <td class="whitespace-nowrap text-right">
                  @if (puedeEscribir()) {
                    <button type="button" class="text-azul-700 hover:underline" (click)="editar(p)">Editar</button>
                    <button type="button" class="ml-3 text-peligro hover:opacity-70" (click)="eliminar(p)">✕</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (meta(); as m) {
          @if (m.pages > 1) {
            <div class="mt-4 flex items-center justify-center gap-3 text-sm">
              <button type="button" class="btn-outline px-3 py-1" [disabled]="m.page <= 1" (click)="irPagina(m.page - 1)">‹</button>
              <span>Página {{ m.page }} de {{ m.pages }}</span>
              <button type="button" class="btn-outline px-3 py-1" [disabled]="m.page >= m.pages" (click)="irPagina(m.page + 1)">›</button>
            </div>
          }
        }
      }
    </div>
  `,
})
export class ProductosComponent {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AdminAuthService);

  readonly productos = signal<Producto[]>([]);
  readonly meta = signal<{ page: number; pages: number } | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly marcas = signal<Marca[]>([]);
  readonly loading = signal(true);
  readonly mostrarForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editId = signal<string | null>(null);

  search = '';
  private page = 1;
  form: ProductoForm = { ...VACIO };

  readonly puedeEscribir = computed(() => this.auth.hasRole('ADMIN', 'SUPER'));

  constructor() {
    this.admin.categoriasAll().subscribe((c) => this.categorias.set(c));
    this.admin.marcasAll().subscribe({ next: (m) => this.marcas.set(m), error: () => {} });
    this.cargar();
  }

  nuevo() {
    this.form = { ...VACIO };
    this.editId.set(null);
    this.error.set(null);
    this.mostrarForm.set(true);
  }

  editar(p: Producto) {
    this.form = {
      nombre: p.nombre, sku: p.sku, precio: Number(p.precio),
      existencias: p.existencias, categoriaId: p.categoriaId ?? '',
      marcaId: p.marcaId ?? '', descripcion: p.descripcion ?? '', estado: p.estado,
    };
    this.editId.set(p.id);
    this.error.set(null);
    this.mostrarForm.set(true);
  }

  guardar() {
    this.error.set(null);
    this.saving.set(true);
    const dto: Record<string, unknown> = {
      nombre: this.form.nombre,
      sku: this.form.sku,
      precio: Number(this.form.precio),
      existencias: Number(this.form.existencias ?? 0),
      estado: this.form.estado,
      categoriaId: this.form.categoriaId || undefined,
      marcaId: this.form.marcaId || undefined,
      descripcion: this.form.descripcion || undefined,
    };
    const id = this.editId();
    const req = id ? this.admin.actualizarProducto(id, dto) : this.admin.crearProducto(dto);
    req.subscribe({
      next: () => { this.saving.set(false); this.mostrarForm.set(false); this.cargar(); },
      error: (e: { error?: { message?: string | string[] } }) => {
        const m = e?.error?.message;
        this.error.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo guardar');
        this.saving.set(false);
      },
    });
  }

  eliminar(p: Producto) {
    this.admin.eliminarProducto(p.id).subscribe(() => this.cargar());
  }

  buscar() { this.page = 1; this.cargar(); }
  irPagina(n: number) { this.page = n; this.cargar(); }

  private cargar() {
    this.loading.set(true);
    this.admin.productos({ search: this.search || undefined, page: this.page, limit: 15 }).subscribe({
      next: (r) => {
        this.productos.set(r.data);
        this.meta.set({ page: r.meta.page, pages: r.meta.pages });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
