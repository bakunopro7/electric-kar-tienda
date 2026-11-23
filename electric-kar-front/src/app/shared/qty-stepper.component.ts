import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * Selector de cantidad (− n +) con objetivos táctiles de 44 px.
 * Uso: `<ek-qty [value]="n" [max]="stock" (valueChange)="n = $event" />`
 */
@Component({
  selector: 'ek-qty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'inline-flex' },
  template: `
    <div class="inline-flex items-center rounded-ek-md border border-borde bg-superficie">
      <button type="button" class="ek-icon-btn rounded-ek-md" [disabled]="value() <= min()"
              [class.opacity-40]="value() <= min()" aria-label="Quitar uno"
              (click)="valueChange.emit(value() - 1)">
        <ek-icon name="minus" class="h-4 w-4" />
      </button>
      <span class="ek-num w-8 text-center text-sm font-semibold" aria-live="polite">{{ value() }}</span>
      <button type="button" class="ek-icon-btn rounded-ek-md" [disabled]="value() >= max()"
              [class.opacity-40]="value() >= max()" aria-label="Agregar uno"
              (click)="valueChange.emit(value() + 1)">
        <ek-icon name="plus" class="h-4 w-4" />
      </button>
    </div>
  `,
})
export class QtyStepperComponent {
  readonly value = input.required<number>();
  readonly min = input(1);
  readonly max = input(Number.MAX_SAFE_INTEGER);
  readonly valueChange = output<number>();
}
