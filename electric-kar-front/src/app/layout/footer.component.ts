import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'ek-footer',
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="mt-12 bg-navy-900 text-white/80">
      <div class="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 text-sm lg:grid-cols-4">
        <div class="col-span-2 lg:col-span-1">
          <div class="font-display text-base font-bold text-white">electrick-Kar</div>
          <p class="mt-2 max-w-xs text-white/60">
            Refacciones y accesorios eléctricos automotrices: baterías, LED, audio,
            alternadores, alarmas, cableado y sensores.
          </p>
        </div>
        <div>
          <h2 class="font-display text-sm font-bold text-white">Tienda</h2>
          <ul class="mt-2 text-white/70">
            <li><a routerLink="/tienda" class="ek-pie">Catálogo</a></li>
            <li><a routerLink="/destacados" class="ek-pie">Destacados y ofertas</a></li>
            <li><a routerLink="/favoritos" class="ek-pie">Favoritos</a></li>
          </ul>
        </div>
        <div>
          <h2 class="font-display text-sm font-bold text-white">Ayuda</h2>
          <ul class="mt-2 text-white/70">
            <li><a routerLink="/faq" class="ek-pie">Preguntas frecuentes</a></li>
            <li><a routerLink="/contacto" class="ek-pie">Contacto</a></li>
            <li><a routerLink="/cuenta" class="ek-pie">Mi cuenta</a></li>
            <li><a routerLink="/blog" class="ek-pie">Blog</a></li>
          </ul>
        </div>
        <div class="col-span-2 lg:col-span-1">
          <h2 class="font-display text-sm font-bold text-white">Contacto</h2>
          <ul class="mt-3 space-y-3 text-white/70">
            <li class="flex items-center gap-2.5"><ek-icon name="pin" class="h-5 w-5 shrink-0 text-azul-500" /> Av. Tecnología 1200, CDMX</li>
            <li><a href="tel:+525512345678" class="flex items-center gap-2.5 hover:text-voltaje"><ek-icon name="phone" class="h-5 w-5 shrink-0 text-azul-500" /> 55 1234 5678</a></li>
            <li><a href="mailto:hola@electrick-kar.com" class="flex items-center gap-2.5 hover:text-voltaje"><ek-icon name="mail" class="h-5 w-5 shrink-0 text-azul-500" /> hola&#64;electrick-kar.com</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">
        © 2026 electrick-Kar. Todos los derechos reservados.
      </div>
    </footer>
  `,
  styles: `
    .ek-pie {
      display: flex;
      min-height: 40px;
      align-items: center;
    }
    .ek-pie:hover {
      color: var(--color-voltaje);
    }
  `,
})
export class FooterComponent {}
