import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, MenuService } from '../core/menu.service';

@Component({
  selector: 'ek-admin-menu',
  imports: [FormsModule],
  template: `
    <h2 class="text-xl font-bold">Menú de navegación</h2>
    <p class="mt-1 text-sm text-black/60 dark:text-white/60">
      Define las secciones que aparecen en la barra de la tienda (Inicio, Catálogo, Blog, Nosotros, Contacto…).
    </p>

    <!-- Alta -->
    <form (ngSubmit)="crear()" class="card mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_90px_auto]">
      <input [(ngModel)]="form.label" name="label" placeholder="Etiqueta (ej. Nosotros)" required class="ek-input" />
      <input [(ngModel)]="form.url" name="url" placeholder="Ruta (ej. /nosotros)" required class="ek-input" />
      <input [(ngModel)]="form.orden" name="orden" type="number" placeholder="Orden" class="ek-input" />
      <button type="submit" class="btn-primary text-sm" [disabled]="saving()">Añadir</button>
    </form>

    <div class="card mt-4 overflow-x-auto">
      @if (loading()) {
        <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p>
      } @else if (items().length === 0) {
        <p class="text-sm text-black/50 dark:text-white/50">Sin elementos. Añade el primero arriba.</p>
      } @else {
        <table class="w-full text-sm">
          <thead class="text-left text-black/50 dark:text-white/50">
            <tr class="border-b border-black/10 dark:border-white/10"><th class="py-2">Orden</th><th>Etiqueta</th><th>Ruta</th><th>Visible</th><th></th></tr>
          </thead>
          <tbody>
            @for (m of items(); track m.id) {
              <tr class="border-b border-black/5 dark:border-white/10">
                <td class="py-2 w-20">
                  <input [ngModel]="m.orden" (ngModelChange)="cambiarOrden(m, $event)" type="number" class="ek-input w-16 py-1" />
                </td>
                <td class="font-semibold">{{ m.label }}</td>
                <td class="font-mono text-xs text-black/60 dark:text-white/60">{{ m.url }}</td>
                <td>
                  <button type="button" (click)="toggle(m)"
                          class="rounded-full px-3 py-1 text-xs font-semibold"
                          [class]="m.visible ? 'bg-exito/15 text-exito' : 'bg-black/10 dark:bg-white/10'">
                    {{ m.visible ? 'Visible' : 'Oculto' }}
                  </button>
                </td>
                <td class="text-right"><button type="button" class="text-peligro hover:opacity-70" (click)="eliminar(m)">✕</button></td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-3 text-xs text-black/40 dark:text-white/40">El orden y la visibilidad se guardan al instante. Cambios reflejados en la tienda al recargar.</p>
      }
    </div>
  `,
})
export class MenuAdminComponent {
  private readonly menu = inject(MenuService);

  readonly items = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  form: Partial<MenuItem> = { label: '', url: '', orden: 0, visible: true };

  constructor() { this.cargar(); }

  crear() {
    if (!this.form.label || !this.form.url) return;
    this.saving.set(true);
    this.menu.crear({ ...this.form, orden: Number(this.form.orden) || 0 }).subscribe({
      next: () => { this.saving.set(false); this.form = { label: '', url: '', orden: 0, visible: true }; this.cargar(); },
      error: () => this.saving.set(false),
    });
  }

  toggle(m: MenuItem) {
    this.menu.actualizar(m.id, { visible: !m.visible }).subscribe(() =>
      this.items.update((list) => list.map((x) => (x.id === m.id ? { ...x, visible: !x.visible } : x))),
    );
  }

  cambiarOrden(m: MenuItem, orden: number) {
    this.menu.actualizar(m.id, { orden: Number(orden) }).subscribe(() => this.cargar());
  }

  eliminar(m: MenuItem) {
    this.menu.eliminar(m.id).subscribe(() => this.cargar());
  }

  private cargar() {
    this.loading.set(true);
    this.menu.all().subscribe({
      next: (l) => { this.items.set(l); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
