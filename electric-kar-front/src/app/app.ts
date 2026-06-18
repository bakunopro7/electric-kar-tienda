import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NgxSonnerToaster } from 'ngx-sonner';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, NgxSonnerToaster],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);

  /** El panel (/admin) usa su propio layout, sin header/footer de la tienda. */
  readonly isAdmin = signal(this.router.url.startsWith('/admin'));

  /**
   * Estilo azul/navy del tema para todos los toasts (Sonner). Los `!` fuerzan
   * que Tailwind gane sobre los estilos por defecto de la librería.
   */
  readonly toastOptions = {
    classes: {
      toast:
        '!bg-navy-900 !border !border-azul-500 !text-white !rounded-ek !shadow-lg',
      title: '!text-white !font-medium',
      description: '!text-white/70',
      closeButton: '!bg-azul-700 !text-white !border-azul-500 hover:!bg-azul-500',
    },
  };

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.isAdmin.set(e.urlAfterRedirects.startsWith('/admin')));
  }
}
