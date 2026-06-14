import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../generated/prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';
import { RolesGuard } from './roles.guard';

/** Crea un ExecutionContext simulado cuya request lleva el `user` dado. */
function contextWithUser(user?: Partial<AuthUser>) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  function setRequiredRoles(roles: Rol[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('rechaza si no hay usuario autenticado', () => {
    setRequiredRoles([Rol.ADMIN]);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza a un cliente (no es personal del panel)', () => {
    setRequiredRoles([Rol.ADMIN]);
    expect(() =>
      guard.canActivate(contextWithUser({ tipo: 'cliente' })),
    ).toThrow(ForbiddenException);
  });

  it('permite a cualquier usuario cuando no se exigen roles', () => {
    setRequiredRoles(undefined);
    expect(
      guard.canActivate(
        contextWithUser({ tipo: 'usuario', rol: Rol.VENDEDOR }),
      ),
    ).toBe(true);
  });

  it('permite a un usuario con el rol requerido', () => {
    setRequiredRoles([Rol.ADMIN, Rol.SUPER]);
    expect(
      guard.canActivate(contextWithUser({ tipo: 'usuario', rol: Rol.ADMIN })),
    ).toBe(true);
  });

  it('rechaza a un usuario sin el rol requerido', () => {
    setRequiredRoles([Rol.SUPER]);
    expect(() =>
      guard.canActivate(
        contextWithUser({ tipo: 'usuario', rol: Rol.VENDEDOR }),
      ),
    ).toThrow(ForbiddenException);
  });
});
