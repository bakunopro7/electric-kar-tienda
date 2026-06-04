import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'ek-admin-placeholder',
  template: `
    <div class="card grid min-h-64 place-items-center text-center">
      <div>
        <div class="text-4xl">🛠️</div>
        <h2 class="mt-3 text-xl font-bold">{{ seccion }}</h2>
        <p class="mt-1 text-sm text-black/50 dark:text-white/50">Esta sección del panel está en construcción.</p>
      </div>
    </div>
  `,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly seccion = (this.route.snapshot.data['seccion'] as string) ?? 'Sección';
}
