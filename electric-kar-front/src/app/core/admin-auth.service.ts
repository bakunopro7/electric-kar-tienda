import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type Rol = 'SUPER' | 'ADMIN' | 'VENDEDOR' | 'CONTADOR';

export interface UsuarioPanel {
  id: string;
  correo: string;
  nombre: string;
  rol: Rol;
}

interface StaffLoginResponse {
  accessToken: string;
  usuario: UsuarioPanel;
}

const TOKEN_KEY = 'ek_admin_token';
const USER_KEY = 'ek_admin_user';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly usuario = signal<UsuarioPanel | null>(this.readUser());
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly rol = computed(() => this.usuario()?.rol ?? null);

  login(correo: string, password: string) {
    return this.http
      .post<StaffLoginResponse>(`${this.base}/staff/login`, { correo, password })
      .pipe(tap((res) => this.store(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.usuario.set(null);
  }

  /** ¿El usuario tiene alguno de los roles indicados? */
  hasRole(...roles: Rol[]): boolean {
    const r = this.rol();
    return r !== null && roles.includes(r);
  }

  private store(res: StaffLoginResponse) {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
    this.token.set(res.accessToken);
    this.usuario.set(res.usuario);
  }

  private readUser(): UsuarioPanel | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UsuarioPanel) : null;
  }
}
