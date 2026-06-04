import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../generated/prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a uno o varios roles del personal del panel.
 * Uso: `@Roles(Rol.ADMIN, Rol.SUPER)` (combinar con JwtAuthGuard + RolesGuard).
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
