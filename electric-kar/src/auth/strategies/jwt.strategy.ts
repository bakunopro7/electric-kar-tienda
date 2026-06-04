import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Rol } from '../../generated/prisma/client';
import {
  AuthUser,
  TipoPrincipal,
} from '../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  correo: string;
  tipo: TipoPrincipal;
  rol?: Rol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** El valor retornado se adjunta a `request.user`. */
  validate(payload: JwtPayload): AuthUser {
    if (!payload?.sub || !payload.tipo) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      correo: payload.correo,
      tipo: payload.tipo,
      rol: payload.rol,
    };
  }
}
