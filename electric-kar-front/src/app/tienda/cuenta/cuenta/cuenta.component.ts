import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth.service';
import {
  ClienteService,
  Direccion,
  PedidoCliente,
  PerfilCliente,
} from '@core/cliente.service';
import { Paginated } from '@core/models';
import { FavoritesService } from '@core/favorites.service';
import { IconComponent, IconName } from '@shared/icon.component';
import { MoneyPipe } from '@shared/money.pipe';

type Seccion = 'resumen' | 'pedidos' | 'direcciones' | 'datos';

@Component({
  selector: 'ek-cuenta',
  imports: [RouterLink, FormsModule, MoneyPipe, DatePipe, IconComponent],
  template: `
    @if (!auth.isAuthenticated()) {
      <div class="card mx-auto max-w-md text-center">
        <p>Inicia sesión para ver tu cuenta.</p>
        <a routerLink="/acceso" class="btn-primary mt-4">Acceder</a>
      </div>
    } @else {
      <!-- Cabecera -->
      <section class="relative -mx-4 overflow-hidden bg-navy-900 px-4 text-white">
        <div class="ek-grid-overlay pointer-events-none absolute inset-0"></div>
        <div class="relative mx-auto flex max-w-7xl items-center gap-4 py-8">
          <div class="grid h-16 w-16 place-items-center rounded-full bg-voltaje font-display text-xl font-bold text-navy-900">{{ iniciales() }}</div>
          <div class="flex-1">
            <span class="font-mono text-xs uppercase tracking-widest text-azul-500">Mi cuenta</span>
            <h1 class="text-2xl font-bold">Hola, {{ perfil()?.nombre || 'cliente' }} 👋</h1>
            <p class="text-sm text-white/60">{{ auth.cliente()?.correo }}</p>
          </div>
          <button type="button" (click)="auth.logout()" class="btn-outline border-white/30 text-sm text-white hover:bg-white hover:text-navy-900">Cerrar sesión</button>
        </div>
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <!-- Nav -->
        <aside class="flex gap-1 overflow-x-auto lg:flex-col">
          @for (s of secciones; track s.id) {
            <button type="button" (click)="seccion.set(s.id)"
                    class="flex items-center gap-2 whitespace-nowrap rounded-ek-md px-3 py-2.5 text-sm font-medium"
                    [class]="seccion() === s.id ? 'bg-azul-700 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'">
              <ek-icon [name]="s.icon" class="h-5 w-5" /> {{ s.label }}
            </button>
          }
          <a routerLink="/favoritos" class="flex items-center gap-2 whitespace-nowrap rounded-ek-md px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5">
            <ek-icon name="heart" class="h-5 w-5" /> Favoritos
          </a>
        </aside>

        <!-- Contenido -->
        <div>
          @switch (seccion()) {
            @case ('resumen') {
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="card"><span class="text-sm text-black/50 dark:text-white/50">Pedidos</span><div class="mt-1 font-display text-2xl font-bold">{{ pedidosMeta()?.total ?? 0 }}</div></div>
                <div class="card"><span class="text-sm text-black/50 dark:text-white/50">Favoritos</span><div class="mt-1 font-display text-2xl font-bold">{{ favs.count() }}</div></div>
                <div class="card"><span class="text-sm text-black/50 dark:text-white/50">Total gastado</span><div class="mt-1 font-display text-2xl font-bold">{{ perfil()?.totalGastado || 0 | money }}</div></div>
              </div>
              <div class="card mt-4">
                <div class="mb-3 flex items-center justify-between"><h2 class="font-bold">Pedidos recientes</h2><button type="button" class="text-sm text-azul-700" (click)="seccion.set('pedidos')">Ver todos</button></div>
                @if (pedidos().length === 0) { <p class="text-sm text-black/50 dark:text-white/50">Aún no tienes pedidos.</p> }
                @for (p of pedidos().slice(0, 3); track p.id) {
                  <div class="flex items-center justify-between border-t border-black/5 py-2.5 text-sm first:border-0 dark:border-white/10">
                    <span class="font-mono">{{ p.folio || p.id.slice(0,8) }}</span>
                    <span class="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{{ p.estado }}</span>
                    <span class="font-mono font-semibold">{{ p.total | money }}</span>
                  </div>
                }
              </div>
            }
            @case ('pedidos') {
              <h2 class="mb-3 text-lg font-bold">Mis pedidos</h2>
              @if (loading()) { <p class="text-sm text-black/50 dark:text-white/50">Cargando…</p> }
              @else if (pedidos().length === 0) { <div class="card text-center text-black/60 dark:text-white/60">Aún no tienes pedidos.</div> }
              @else {
                <div class="space-y-2">
                  @for (p of pedidos(); track p.id) {
                    <div class="card flex items-center justify-between">
                      <div><p class="font-mono text-sm">{{ p.folio || p.id.slice(0,8) }}</p><p class="text-xs text-black/50 dark:text-white/50">{{ p.creadoEn | date: 'short' }}</p></div>
                      <span class="rounded-full bg-azul-700/10 px-3 py-1 text-xs font-semibold text-azul-700">{{ p.estado }}</span>
                      <span class="font-mono font-bold">{{ p.total | money }}</span>
                    </div>
                  }
                </div>
              }
            }
            @case ('direcciones') {
              <div class="mb-3 flex items-center justify-between"><h2 class="text-lg font-bold">Mis direcciones</h2><button type="button" class="btn-primary text-sm" (click)="formDir.set(!formDir())">{{ formDir() ? 'Cancelar' : 'Añadir' }}</button></div>
              @if (formDir()) {
                <form (ngSubmit)="guardarDireccion()" class="card mb-3 grid gap-3 sm:grid-cols-2">
                  <input [(ngModel)]="nuevaDir.calle" name="calle" placeholder="Calle y número" required class="ek-input sm:col-span-2" />
                  <input [(ngModel)]="nuevaDir.colonia" name="colonia" placeholder="Colonia" class="ek-input" />
                  <input [(ngModel)]="nuevaDir.cp" name="cp" placeholder="C.P." required class="ek-input" />
                  <input [(ngModel)]="nuevaDir.ciudad" name="ciudad" placeholder="Ciudad" class="ek-input" />
                  <input [(ngModel)]="nuevaDir.estado" name="estado" placeholder="Estado" class="ek-input" />
                  <button type="submit" class="btn-primary sm:col-span-2">Guardar dirección</button>
                </form>
              }
              @if (direcciones().length === 0) { <div class="card text-center text-black/60 dark:text-white/60">Sin direcciones guardadas.</div> }
              <div class="space-y-2">
                @for (d of direcciones(); track d.id) {
                  <div class="card flex items-start justify-between">
                    <div class="text-sm"><p class="font-semibold">{{ d.calle }}</p><p class="text-black/60 dark:text-white/60">{{ d.colonia }}, {{ d.cp }} · {{ d.ciudad }} {{ d.estado }}</p></div>
                    <button type="button" class="text-peligro hover:opacity-70" (click)="eliminarDireccion(d)">✕</button>
                  </div>
                }
              </div>
            }
            @case ('datos') {
              <h2 class="mb-3 text-lg font-bold">Datos personales</h2>
              <form (ngSubmit)="guardarDatos()" class="card grid max-w-lg gap-3">
                <label class="text-sm font-semibold">Nombre<input [(ngModel)]="datos.nombre" name="nombre" class="ek-input mt-1 w-full" /></label>
                <label class="text-sm font-semibold">Teléfono<input [(ngModel)]="datos.telefono" name="telefono" class="ek-input mt-1 w-full" /></label>
                <label class="text-sm font-semibold">RFC<input [(ngModel)]="datos.rfc" name="rfc" class="ek-input mt-1 w-full uppercase" /></label>
                <p class="text-sm text-black/50 dark:text-white/50">Correo: {{ perfil()?.correo }}</p>
                @if (datosOk()) { <p class="text-sm text-exito">Datos guardados ✓</p> }
                <button type="submit" class="btn-primary">Guardar cambios</button>
              </form>
            }
          }
        </div>
      </div>
    }
  `,
})
export class CuentaComponent {
  protected readonly auth = inject(AuthService);
  protected readonly favs = inject(FavoritesService);
  private readonly cliente = inject(ClienteService);

  readonly seccion = signal<Seccion>('resumen');
  readonly perfil = signal<PerfilCliente | null>(null);
  readonly pedidos = signal<PedidoCliente[]>([]);
  readonly pedidosMeta = signal<Paginated<PedidoCliente>['meta'] | null>(null);
  readonly direcciones = signal<Direccion[]>([]);
  readonly loading = signal(false);
  readonly formDir = signal(false);
  readonly datosOk = signal(false);

  nuevaDir: Partial<Direccion> = {};
  datos = { nombre: '', telefono: '', rfc: '' };

  readonly secciones: { id: Seccion; label: string; icon: IconName }[] = [
    { id: 'resumen', label: 'Resumen', icon: 'grid' },
    { id: 'pedidos', label: 'Mis pedidos', icon: 'box' },
    { id: 'direcciones', label: 'Direcciones', icon: 'truck' },
    { id: 'datos', label: 'Datos personales', icon: 'user' },
  ];

  readonly iniciales = computed(() => {
    const n = this.perfil()?.nombre || this.auth.cliente()?.correo || '?';
    return n.slice(0, 2).toUpperCase();
  });

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.loading.set(true);
      this.cliente.perfil().subscribe({
        next: (p) => {
          this.perfil.set(p);
          this.datos = { nombre: p.nombre, telefono: p.telefono ?? '', rfc: p.rfc ?? '' };
        },
        error: () => {},
      });
      this.cliente.pedidos().subscribe({
        next: (r) => { this.pedidos.set(r.data); this.pedidosMeta.set(r.meta); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
      this.cliente.direcciones().subscribe({ next: (d) => this.direcciones.set(d), error: () => {} });
    }
  }

  guardarDireccion() {
    this.cliente.agregarDireccion(this.nuevaDir).subscribe(() => {
      this.nuevaDir = {};
      this.formDir.set(false);
      this.cliente.direcciones().subscribe((d) => this.direcciones.set(d));
    });
  }

  eliminarDireccion(d: Direccion) {
    this.cliente.eliminarDireccion(d.id).subscribe(() =>
      this.direcciones.update((list) => list.filter((x) => x.id !== d.id)),
    );
  }

  guardarDatos() {
    this.datosOk.set(false);
    this.cliente.actualizarPerfil(this.datos).subscribe((p) => {
      this.perfil.set(p);
      this.datosOk.set(true);
    });
  }
}
