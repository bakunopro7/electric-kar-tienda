import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService, Rol } from './admin-auth.service';

/** Exige sesión de personal; si no, redirige al login del panel. */
export const adminAuthGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/admin/login']);
};

/** Exige alguno de los roles indicados; si no, redirige al dashboard. */
export const rolesGuard = (...roles: Rol[]): CanActivateFn => {
  return () => {
    const auth = inject(AdminAuthService);
    const router = inject(Router);
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/admin']);
  };
};
