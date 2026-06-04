import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../generated/prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Exige que el principal sea un `usuario` (personal del panel) con alguno de
 * los roles requeridos por `@Roles(...)`. Debe usarse tras JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();

    if (!user || user.tipo !== 'usuario') {
      throw new ForbiddenException('Requiere acceso de personal del panel');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!user.rol || !requiredRoles.includes(user.rol)) {
      throw new ForbiddenException('No tienes el rol necesario');
    }

    return true;
  }
}
