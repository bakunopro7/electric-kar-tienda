import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '@core/admin-auth.service';
import { IconComponent } from '@shared/icon.component';

@Component({
  selector: 'ek-admin-login',
  imports: [FormsModule, IconComponent],
  template: `
    <div class="ek-grid-overlay absolute inset-0 opacity-50"></div>
    <div class="relative grid min-h-screen place-items-center p-4">
      <div class="w-full max-w-sm rounded-[22px] bg-white p-8 shadow-2xl dark:bg-navy-800">
        <div class="mb-6 flex items-center gap-2.5">
          <span class="grid h-10 w-10 place-items-center rounded-[10px] bg-voltaje text-navy-900">
            <ek-icon name="bolt" class="h-6 w-6" />
          </span>
          <div>
            <div class="font-display text-lg font-bold">electrick<span class="text-azul-700">-Kar</span></div>
            <small class="text-xs text-black/50 dark:text-white/50">Panel de administración</small>
          </div>
        </div>

        <form (ngSubmit)="submit()" class="space-y-3">
          <div>
            <label class="text-sm font-semibold">Correo</label>
            <input [(ngModel)]="correo" name="correo" type="email" required class="ek-input mt-1 w-full" placeholder="admin@electrick-kar.mx" />
          </div>
          <div>
            <label class="text-sm font-semibold">Contraseña</label>
            <input [(ngModel)]="password" name="password" type="password" required class="ek-input mt-1 w-full" />
          </div>
          @if (error()) {
            <p class="text-sm text-peligro">{{ error() }}</p>
          }
          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Entrando…' : 'Entrar al panel' }}
          </button>
        </form>
      </div>
    </div>
  `,
  host: { class: 'relative block min-h-screen bg-navy-900 text-white' },
})
export class AdminLoginComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  correo = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit() {
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.correo, this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (e: { error?: { message?: string } }) => {
        this.error.set(e?.error?.message ?? 'Credenciales inválidas');
        this.loading.set(false);
      },
    });
  }
}
