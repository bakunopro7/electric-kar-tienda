import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'ek-recuperar',
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="mx-auto max-w-md py-6">
      <a routerLink="/acceso" class="mb-6 inline-flex items-center gap-1 text-sm text-black/50 hover:text-azul-700 dark:text-white/50">
        <ek-icon name="chevron" class="h-4 w-4 rotate-180" /> Volver al acceso
      </a>

      <div class="card">
        <h1 class="text-2xl font-bold">Recuperar contraseña</h1>

        @if (paso() === 1) {
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">Escribe tu correo y te daremos instrucciones para restablecerla.</p>
          <form (ngSubmit)="solicitar()" class="mt-4 space-y-3">
            <input [(ngModel)]="correo" name="correo" type="email" required class="ek-input w-full" placeholder="tu@correo.com" />
            @if (error()) { <p class="text-sm text-peligro">{{ error() }}</p> }
            <button type="submit" class="btn-primary w-full" [disabled]="loading()">{{ loading() ? 'Enviando…' : 'Enviar instrucciones' }}</button>
          </form>
        } @else {
          <p class="mt-1 text-sm text-black/60 dark:text-white/60">{{ mensaje() }}</p>
          @if (tokenDemo()) {
            <div class="mt-3 rounded-[10px] bg-voltaje/15 px-3 py-2 text-xs">
              <b>Modo demo</b> (sin servidor de correo): tu token de recuperación es
              <code class="break-all font-mono">{{ tokenDemo() }}</code>. Ya lo pusimos abajo.
            </div>
          }
          <form (ngSubmit)="restablecer()" class="mt-4 space-y-3">
            <input [(ngModel)]="token" name="token" required class="ek-input w-full font-mono text-sm" placeholder="Token de recuperación" />
            <input [(ngModel)]="password" name="password" type="password" required minlength="6" class="ek-input w-full" placeholder="Nueva contraseña" />
            @if (error()) { <p class="text-sm text-peligro">{{ error() }}</p> }
            @if (exito()) { <p class="flex items-center gap-2 text-sm text-exito"><ek-icon name="check" class="h-4 w-4" /> {{ exito() }}</p> }
            @if (!exito()) {
              <button type="submit" class="btn-primary w-full" [disabled]="loading()">{{ loading() ? 'Guardando…' : 'Restablecer contraseña' }}</button>
            } @else {
              <a routerLink="/acceso" class="btn-primary w-full">Ir a iniciar sesión</a>
            }
          </form>
        }
      </div>
    </div>
  `,
})
export class RecuperarComponent {
  private readonly auth = inject(AuthService);

  readonly paso = signal<1 | 2>(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mensaje = signal('');
  readonly tokenDemo = signal<string | null>(null);
  readonly exito = signal<string | null>(null);

  correo = '';
  token = '';
  password = '';

  solicitar() {
    this.error.set(null);
    this.loading.set(true);
    this.auth.forgotPassword(this.correo).subscribe({
      next: (r) => {
        this.mensaje.set(r.mensaje);
        if (r.token) {
          this.tokenDemo.set(r.token);
          this.token = r.token;
        }
        this.paso.set(2);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo procesar la solicitud');
        this.loading.set(false);
      },
    });
  }

  restablecer() {
    this.error.set(null);
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: (r) => {
        this.exito.set(r.mensaje);
        this.loading.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.error.set(e?.error?.message ?? 'Token inválido o expirado');
        this.loading.set(false);
      },
    });
  }
}
