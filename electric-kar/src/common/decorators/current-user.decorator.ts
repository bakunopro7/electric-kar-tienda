import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../../generated/prisma/client';

/** Tipo de principal autenticado. */
export type TipoPrincipal = 'cliente' | 'usuario';

/**
 * Principal autenticado adjuntado a la request por JwtStrategy.
 * - `cliente`: comprador de la tienda (sin rol).
 * - `usuario`: personal del panel (con `rol`).
 */
export interface AuthUser {
  id: string;
  correo: string;
  tipo: TipoPrincipal;
  rol?: Rol;
}

/**
 * Inyecta el principal autenticado en el handler.
 * Uso: `@CurrentUser() user: AuthUser`
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
