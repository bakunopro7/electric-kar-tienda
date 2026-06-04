import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protege rutas exigiendo un JWT válido en el header Authorization.
 * Uso: `@UseGuards(JwtAuthGuard)`
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
