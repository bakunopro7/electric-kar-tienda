import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContenidoService } from '@core/contenido.service';
import { DatosContacto } from '@core/models';

@Component({
  selector: 'ek-footer',
  imports: [RouterLink],
  template: `
    <footer class="mt-16 border-t border-black/10 bg-navy-900 text-white/80 dark:border-white/10">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div class="font-display text-base font-bold text-white">electrick<span class="text-voltaje">-</span>Kar</div>
          <p class="mt-2 max-w-xs text-white/60">
            Refacciones y accesorios eléctricos automotrices: baterías, LED, audio,
            alternadores, alarmas, cableado y sensores.
          </p>
        </div>
        <div>
          <h4 class="font-display font-bold text-white">Tienda</h4>
          <ul class="mt-3 space-y-1.5 text-white/60">
            <li><a routerLink="/tienda" class="hover:text-voltaje">Catálogo</a></li>
            <li><a routerLink="/destacados" class="hover:text-voltaje">Destacados &amp; ofertas</a></li>
            <li><a routerLink="/favoritos" class="hover:text-voltaje">Favoritos</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-display font-bold text-white">Ayuda</h4>
          <ul class="mt-3 space-y-1.5 text-white/60">
            <li><a routerLink="/faq" class="hover:text-voltaje">Preguntas frecuentes</a></li>
            <li><a routerLink="/blog" class="hover:text-voltaje">Blog</a></li>
            <li><a routerLink="/cuenta" class="hover:text-voltaje">Mi cuenta</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-display font-bold text-white">Contacto</h4>
          @if (contacto(); as c) {
            <ul class="mt-3 space-y-1.5 text-white/60">
              <li>📍 {{ c.direccion }}</li>
              <li>📞 {{ c.telefono }}</li>
              <li>✉ {{ c.correo }}</li>
            </ul>
          }
        </div>
      </div>
      <div class="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        © 2026 electrick-Kar. Todos los derechos reservados.
      </div>
    </footer>
  `,
})
export class FooterComponent {
  private readonly contenido = inject(ContenidoService);
  readonly contacto = signal<DatosContacto | null>(null);

  constructor() {
    this.contenido.contacto().subscribe({
      next: (c) => this.contacto.set(c),
      error: () => this.contacto.set(null),
    });
  }
}
