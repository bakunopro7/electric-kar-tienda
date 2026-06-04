import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../core/admin.service';
import { Articulo, BlogService } from '../core/blog.service';

interface ArtForm {
  slug: string;
  titulo: string;
  categoria: string;
  resumen: string;
  contenido: string; // textarea (un párrafo por línea)
  imagen: string;
  autorNombre: string;
  autorRol: string;
  lectura: string;
  etiqueta: string;
  destacado: boolean;
  publicado: boolean;
}

const VACIO: ArtForm = {
  slug: '', titulo: '', categoria: 'Guías', resumen: '', contenido: '', imagen: '',
  autorNombre: 'Carlos Téllez', autorRol: 'Técnico eléctrico automotriz',
  lectura: '', etiqueta: '', destacado: false, publicado: true,
};

@Component({
  selector: 'ek-admin-blog',
  imports: [FormsModule],
  template: `
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Blog</h2>
      <button type="button" class="btn-primary text-sm" (click)="nuevo()">Nuevo artículo</button>
    </div>

    @if (mostrarForm()) {
      <form (ngSubmit)="guardar()" class="card mt-4 grid gap-3 sm:grid-cols-2">
        <input [(ngModel)]="form.titulo" name="titulo" placeholder="Título" required class="ek-input" (ngModelChange)="autoSlug()" />
        <input [(ngModel)]="form.slug" name="slug" placeholder="slug-del-articulo" required class="ek-input" />
        <select [(ngModel)]="form.categoria" name="cat" class="ek-input">
          @for (c of categorias; track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <input [(ngModel)]="form.etiqueta" name="et" placeholder="Etiqueta (Guía/Top/Nuevo)" class="ek-input" />
        <input [(ngModel)]="form.resumen" name="res" placeholder="Resumen" required class="ek-input sm:col-span-2" />
        <textarea [(ngModel)]="form.contenido" name="cont" rows="6" placeholder="Contenido — un párrafo por línea" class="ek-input sm:col-span-2"></textarea>
        <input [(ngModel)]="form.autorNombre" name="an" placeholder="Autor" class="ek-input" />
        <input [(ngModel)]="form.autorRol" name="ar" placeholder="Rol del autor" class="ek-input" />
        <input [(ngModel)]="form.lectura" name="lec" placeholder="Tiempo de lectura (ej. 5 min)" class="ek-input" />

        <!-- Imagen -->
        <div class="sm:col-span-2">
          <label class="text-sm font-semibold">Imagen de portada</label>
          <div class="mt-2 flex items-center gap-3">
            @if (form.imagen) {
              <div class="relative h-20 w-32 overflow-hidden rounded-[8px] border border-black/10 dark:border-white/10">
                <img [src]="form.imagen" alt="" class="h-full w-full object-cover" />
                <button type="button" (click)="form.imagen=''" class="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-peligro text-xs text-white">✕</button>
              </div>
            }
            <label class="grid h-20 w-32 cursor-pointer place-items-center rounded-[8px] border-2 border-dashed border-black/20 text-2xl text-black/40 hover:border-azul-500 dark:border-white/20">
              {{ subiendo() ? '…' : '+' }}
              <input type="file" accept="image/*" class="hidden" (change)="onFile($event)" [disabled]="subiendo()" />
            </label>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="form.destacado" name="dest" /> Destacado</label>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="form.publicado" name="pub" /> Publicado</label>

        @if (error()) { <p class="text-sm text-peligro sm:col-span-2">{{ error() }}</p> }
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : (editId() ? 'Guardar' : 'Crear') }}</button>
          <button type="button" class="btn-outline" (click)="mostrarForm.set(false)">Cancelar</button>
        </div>
      </form>
    }

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (articulos().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin artículos.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Título</th><th>Categoría</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            @for (a of articulos(); track a.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2.5 font-semibold">{{ a.titulo }} @if (a.destacado) { <span class="ml-1 rounded-full bg-voltaje/20 px-2 py-0.5 text-xs text-voltaje-600">★</span> }</td>
                <td class="text-black/60 dark:text-white/60">{{ a.categoria }}</td>
                <td><span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="a.publicado ? 'bg-exito/15 text-exito' : 'bg-black/10 dark:bg-white/10'">{{ a.publicado ? 'Publicado' : 'Borrador' }}</span></td>
                <td class="whitespace-nowrap text-right">
                  <button type="button" class="text-azul-700 hover:underline" (click)="editar(a)">Editar</button>
                  <button type="button" class="ml-3 text-peligro hover:opacity-70" (click)="eliminar(a)">✕</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class BlogAdminComponent {
  private readonly blog = inject(BlogService);
  private readonly admin = inject(AdminService);

  readonly categorias = ['Guías', 'Mantenimiento', 'Iluminación', 'Audio', 'Novedades'];
  readonly articulos = signal<Articulo[]>([]);
  readonly loading = signal(true);
  readonly mostrarForm = signal(false);
  readonly saving = signal(false);
  readonly subiendo = signal(false);
  readonly error = signal<string | null>(null);
  readonly editId = signal<string | null>(null);
  form: ArtForm = { ...VACIO };

  constructor() { this.cargar(); }

  nuevo() { this.form = { ...VACIO }; this.editId.set(null); this.error.set(null); this.mostrarForm.set(true); }

  autoSlug() {
    if (this.editId()) return;
    this.form.slug = this.form.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  }

  editar(a: Articulo) {
    this.form = {
      slug: a.slug, titulo: a.titulo, categoria: a.categoria, resumen: a.resumen,
      contenido: (a.contenido ?? []).join('\n'), imagen: a.imagen ?? '',
      autorNombre: a.autorNombre, autorRol: a.autorRol ?? '', lectura: a.lectura ?? '',
      etiqueta: a.etiqueta ?? '', destacado: a.destacado, publicado: a.publicado,
    };
    this.editId.set(a.id);
    this.error.set(null);
    this.mostrarForm.set(true);
  }

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.subiendo.set(true);
    this.admin.subirImagen(file).subscribe({
      next: (r) => { this.form.imagen = r.url; this.subiendo.set(false); },
      error: () => { this.error.set('No se pudo subir la imagen'); this.subiendo.set(false); },
    });
  }

  guardar() {
    this.error.set(null);
    this.saving.set(true);
    const dto: Partial<Articulo> = {
      slug: this.form.slug, titulo: this.form.titulo, categoria: this.form.categoria,
      resumen: this.form.resumen,
      contenido: this.form.contenido.split('\n').map((p) => p.trim()).filter(Boolean),
      imagen: this.form.imagen || undefined,
      autorNombre: this.form.autorNombre, autorRol: this.form.autorRol || undefined,
      lectura: this.form.lectura || undefined, etiqueta: this.form.etiqueta || undefined,
      destacado: this.form.destacado, publicado: this.form.publicado,
    };
    const id = this.editId();
    const req = id ? this.blog.actualizar(id, dto) : this.blog.crear(dto);
    req.subscribe({
      next: () => { this.saving.set(false); this.mostrarForm.set(false); this.cargar(); },
      error: (e: { error?: { message?: string | string[] } }) => {
        const m = e?.error?.message;
        this.error.set(Array.isArray(m) ? m.join(', ') : m ?? 'No se pudo guardar');
        this.saving.set(false);
      },
    });
  }

  eliminar(a: Articulo) { this.blog.eliminar(a.id).subscribe(() => this.cargar()); }

  private cargar() {
    this.loading.set(true);
    this.blog.all().subscribe({
      next: (l) => { this.articulos.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
