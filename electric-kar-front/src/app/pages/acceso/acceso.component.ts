import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'ek-acceso',
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="mx-auto max-w-md py-6">
      <a routerLink="/" class="mb-6 inline-flex items-center gap-1 text-sm text-black/50 hover:text-azul-700 dark:text-white/50">
        <ek-icon name="chevron" class="h-4 w-4 rotate-180" /> Volver a la tienda
      </a>

      <div class="card">
        <div class="mb-5 flex items-center gap-2.5">
          <span class="grid h-10 w-10 place-items-center rounded-[10px] bg-voltaje text-navy-900"><ek-icon name="bolt" class="h-6 w-6" /></span>
          <span class="font-display text-lg font-bold">electrick<span class="text-azul-700 dark:text-azul-500">-Kar</span></span>
        </div>

        <div class="mb-5 flex rounded-full bg-black/5 p-1 dark:bg-white/5">
          <button type="button" class="flex-1 rounded-full py-2 text-sm font-semibold transition-colors"
                  [class]="mode() === 'login' ? 'bg-azul-700 text-white' : ''" (click)="mode.set('login')">Iniciar sesión</button>
          <button type="button" class="flex-1 rounded-full py-2 text-sm font-semibold transition-colors"
                  [class]="mode() === 'register' ? 'bg-azul-700 text-white' : ''" (click)="mode.set('register')">Crear cuenta</button>
        </div>

        <h1 class="text-2xl font-bold">{{ mode() === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta' }}</h1>
        <p class="mt-1 text-sm text-black/60 dark:text-white/60">
          {{ mode() === 'login' ? 'Ingresa tus datos para acceder.' : 'Únete y obtén 10% en tu primera compra.' }}
        </p>

        <form (ngSubmit)="submit()" class="mt-5 space-y-3">
          @if (mode() === 'register') {
            <label class="block">
              <span class="text-sm font-semibold">Nombre completo</span>
              <span class="relative mt-1 block">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><ek-icon name="user" class="h-5 w-5" /></span>
                <input [(ngModel)]="nombre" name="nombre" required class="ek-input w-full pl-10" placeholder="Juan Pérez" />
              </span>
            </label>
          }
          <label class="block">
            <span class="text-sm font-semibold">Correo electrónico</span>
            <span class="relative mt-1 block">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><ek-icon name="user" class="h-5 w-5" /></span>
              <input [(ngModel)]="correo" name="correo" type="email" required class="ek-input w-full pl-10" placeholder="tu@correo.com" />
            </span>
          </label>
          <label class="block">
            <span class="text-sm font-semibold">Contraseña</span>
            <span class="relative mt-1 block">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><ek-icon name="lock" class="h-5 w-5" /></span>
              <input [(ngModel)]="password" name="password" [type]="showPass() ? 'text' : 'password'" required minlength="6" class="ek-input w-full px-10" placeholder="••••••••" />
              <button type="button" (click)="showPass.set(!showPass())" class="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" aria-label="Mostrar contraseña">
                <ek-icon name="search" class="h-5 w-5" />
              </button>
            </span>
          </label>

          @if (mode() === 'login') {
            <div class="text-right">
              <a routerLink="/recuperar" class="text-sm text-azul-700 hover:underline dark:text-azul-500">¿Olvidaste tu contraseña?</a>
            </div>
          }

          @if (error()) { <p class="text-sm text-peligro">{{ error() }}</p> }

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Procesando…' : (mode() === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta') }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AccesoComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPass = signal(false);

  nombre = '';
  correo = '';
  password = '';

  submit() {
    this.error.set(null);
    this.loading.set(true);
    const done = {
      next: () => this.router.navigateByUrl('/cuenta'),
      error: (e: { error?: { message?: string | string[] } }) => {
        const msg = e?.error?.message;
        this.error.set(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error de autenticación');
        this.loading.set(false);
      },
    };
    if (this.mode() === 'login') {
      this.auth.login({ correo: this.correo, password: this.password }).subscribe(done);
    } else {
      this.auth.register({ correo: this.correo, password: this.password, nombre: this.nombre }).subscribe(done);
    }
  }
}
