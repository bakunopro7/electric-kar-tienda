import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Exige que el principal autenticado sea un `cliente` de la tienda.
 * Debe usarse tras JwtAuthGuard.
 */
@Injectable()
export class ClienteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user || user.tipo !== 'cliente') {
      throw new ForbiddenException('Requiere una cuenta de cliente');
    }
    return true;
  }
}
