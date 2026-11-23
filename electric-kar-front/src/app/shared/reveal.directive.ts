import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

/**
 * Hace aparecer el elemento cuando entra en pantalla (una sola vez).
 * Uso: `<section ekReveal>` o `<li ekReveal [ekRevealDelay]="i * 60">`.
 *
 * SSR-safe: en el servidor no hace nada y el contenido sale visible; la clase
 * que lo oculta solo se aplica en el navegador, y solo a lo que aún no se ve.
 */
@Directive({ selector: '[ekReveal]' })
export class RevealDirective {
  /** Retraso en ms, para escalonar elementos de una misma fila. */
  readonly ekRevealDelay = input(0);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce || typeof IntersectionObserver === 'undefined') return;
      // Lo que ya está a la vista al cargar no se oculta (evita parpadeos).
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

      el.classList.add('ek-reveal');
      el.style.transitionDelay = `${this.ekRevealDelay()}ms`;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          el.classList.add('ek-visible');
          io.disconnect();
        },
        { threshold: 0.12 },
      );
      io.observe(el);
    });
  }
}

