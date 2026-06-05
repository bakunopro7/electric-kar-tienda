import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  REQUEST,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';

const THEME_KEY = 'ek_theme';
const COOKIE = 'ek_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Field ordering: isBrowser MUST be declared before isDark so the field
  // initializer for isDark can safely call this.seed() which reads this.isBrowser.
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  // REQUEST is provided by AngularNodeAppEngine per-request on the server;
  // it is null on the client.
  private readonly request = inject(REQUEST, { optional: true });

  readonly isDark = signal<boolean>(this.seed());

  constructor() {
    // SERVER: effect() runs during render and applies the class to the server
    // DOCUMENT so the HTML emitted already has class="dark" — no flash on load.
    // CLIENT: keeps <html class>, cookie, and localStorage in sync on every change.
    effect(() => {
      const dark = this.isDark();
      this.doc.documentElement.classList.toggle('dark', dark);
      if (this.isBrowser) {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        document.cookie =
          `${COOKIE}=${dark ? 'dark' : 'light'}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
    });
  }

  toggle() {
    this.isDark.update((v) => !v);
  }

  private seed(): boolean {
    if (this.isBrowser) {
      // Prefer cookie (server-visible truth); fall back to localStorage.
      const ck = this.readCookieBrowser();
      if (ck !== null) return ck === 'dark';
      return localStorage.getItem(THEME_KEY) === 'dark';
    }
    // Server: read ek_theme from the incoming request cookie header.
    if (this.request) {
      const cookieHeader = this.request.headers.get('cookie') ?? '';
      const m = cookieHeader.match(/(?:^|; )ek_theme=([^;]+)/);
      return m ? decodeURIComponent(m[1]) === 'dark' : false;
    }
    return false;
  }

  private readCookieBrowser(): string | null {
    const m = document.cookie.match(/(?:^|; )ek_theme=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}
