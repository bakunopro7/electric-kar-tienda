import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';

/**
 * Fachada de notificaciones de la app. Por dentro usa `ngx-sonner` (port de
 * Sonner), pero el resto del código no lo sabe: llama siempre a esta API
 * estable. Si mañana cambiamos de motor, solo se toca este archivo.
 *
 *   private readonly notifications = inject(NotificationService);
 *   this.notifications.success('¡Listo!');
 *
 * El estilo (azul del tema) se configura una sola vez en el `<ngx-sonner-toaster>`
 * montado en app.html.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  success(mensaje: string): void {
    toast.success(mensaje);
  }

  error(mensaje: string): void {
    toast.error(mensaje);
  }

  info(mensaje: string): void {
    toast.info(mensaje);
  }
}
