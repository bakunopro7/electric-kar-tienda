import { Injectable, effect, signal } from '@angular/core';

const THEME_KEY = 'ek_theme';

/** Modo oscuro persistente: aplica la clase `.dark` al <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(localStorage.getItem(THEME_KEY) === 'dark');

  constructor() {
    effect(() => {
      const dark = this.isDark();
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    });
  }

  toggle() {
    this.isDark.update((v) => !v);
  }
}
