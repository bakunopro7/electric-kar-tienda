import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../../src/auth/strategies/jwt.strategy';

/**
 * Signs a JWT with the app's real JwtService (same secret JwtStrategy validates).
 *
 * Claim shapes (verified against auth.service.ts / jwt.strategy.ts):
 *   cliente: { sub: cliente.id, correo, tipo: 'cliente' }            // NO rol
 *   staff:   { sub: usuario.id, correo, tipo: 'usuario', rol: 'ADMIN' }
 */
export function generateToken(app: INestApplication, payload: JwtPayload): string {
  return app.get(JwtService).sign(payload);
}
