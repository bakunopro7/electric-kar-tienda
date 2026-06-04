import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuthService } from './admin-auth.service';
import { AuthService } from './auth.service';
import { USE_ADMIN_TOKEN } from './http-context';

/**
 * Adjunta el JWT en Authorization. Si la petición está marcada con
 * `adminContext()`, usa el token del panel (Usuario); si no, el de cliente.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const useAdmin = req.context.get(USE_ADMIN_TOKEN);
  const token = useAdmin
    ? inject(AdminAuthService).token()
    : inject(AuthService).token();

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
