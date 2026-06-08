import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, ClienteAuth } from './models';

const TOKEN_KEY = 'ek_token';
const CLIENTE_KEY = 'ek_cliente';

export interface RegisterDto {
  correo: string;
  password: string;
  nombre: string;
  telefono?: string;
  rfc?: string;
}

export interface LoginDto {
  correo: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(
    this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null,
  );
  readonly cliente = signal<ClienteAuth | null>(this.readCliente());
  readonly isAuthenticated = computed(() => this.token() !== null);

  register(dto: RegisterDto) {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, dto)
      .pipe(tap((res) => this.store(res)));
  }

  login(dto: LoginDto) {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, dto)
      .pipe(tap((res) => this.store(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CLIENTE_KEY);
    this.token.set(null);
    this.cliente.set(null);
  }

  googleLogin(idToken: string) {
    return this.http
      .post<AuthResponse>(`${this.base}/google`, { idToken })
      .pipe(tap((res) => this.store(res)));
  }

  forgotPassword(correo: string) {
    return this.http.post<{ mensaje: string; token?: string }>(
      `${this.base}/forgot-password`,
      { correo },
    );
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ mensaje: string }>(`${this.base}/reset-password`, {
      token,
      password,
    });
  }

  private store(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(CLIENTE_KEY, JSON.stringify(res.cliente));
    this.token.set(res.accessToken);
    this.cliente.set(res.cliente);
  }

  private readCliente(): ClienteAuth | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(CLIENTE_KEY);
    return raw ? (JSON.parse(raw) as ClienteAuth) : null;
  }
}
