import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Marca una petición para que use el token del panel (Usuario) y no el de cliente. */
export const USE_ADMIN_TOKEN = new HttpContextToken<boolean>(() => false);

export const adminContext = () =>
  new HttpContext().set(USE_ADMIN_TOKEN, true);
