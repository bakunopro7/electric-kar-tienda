import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoActividad } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

/** Metadatos de la petición de login (para sesión y auditoría). */
export interface LoginMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auditoria: AuditoriaService,
    private readonly config: ConfigService,
  ) {}

  // --- Cliente (tienda) -----------------------------------------------------

  async registerCliente(dto: RegisterDto) {
    const correo = dto.correo.toLowerCase();
    const existing = await this.prisma.cliente.findUnique({
      where: { correo },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const cliente = await this.prisma.cliente.create({
      data: {
        correo,
        password,
        nombre: dto.nombre,
        telefono: dto.telefono,
        rfc: dto.rfc,
      },
    });

    return this.tokenCliente(cliente.id, cliente.correo);
  }

  async loginCliente(dto: LoginDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { correo: dto.correo.toLowerCase() },
    });
    if (!cliente || !(await bcrypt.compare(dto.password, cliente.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.tokenCliente(cliente.id, cliente.correo);
  }

  // --- Recuperación de contraseña (cliente) --------------------------------

  /**
   * Genera un token de recuperación válido 1 hora.
   *
   * Nota: sin proveedor de correo, el token se devuelve en la respuesta (modo
   * demo) para poder probar el flujo. En producción se enviaría por email y la
   * respuesta sería siempre genérica (sin revelar si el correo existe).
   */
  async forgotPassword(correo: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { correo: correo.toLowerCase() },
    });
    const generico = {
      mensaje: 'Si el correo existe, te enviamos instrucciones para restablecerla.',
    };
    if (!cliente) return generico;

    const token = randomUUID();
    await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        resetToken: token,
        resetTokenExpira: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // DEMO: token incluido en la respuesta (en producción iría por correo).
    return { ...generico, token };
  }

  async resetPassword(token: string, password: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { resetToken: token },
    });
    if (
      !cliente ||
      !cliente.resetTokenExpira ||
      cliente.resetTokenExpira < new Date()
    ) {
      throw new BadRequestException('Token inválido o expirado');
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { password: hashed, resetToken: null, resetTokenExpira: null },
    });
    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  // --- Login con Google (cliente) ------------------------------------------

  async googleLogin(idToken: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Login con Google no configurado (falta GOOGLE_CLIENT_ID)',
      );
    }

    const client = new OAuth2Client(clientId);
    let payload: TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    // Solo aceptamos correos cuya titularidad Google verificó. Sin esta
    // comprobación, un correo no verificado podría dar de alta una cuenta.
    if (!payload?.email_verified) {
      throw new UnauthorizedException(
        'La cuenta de Google no tiene el correo verificado',
      );
    }
    const correo = payload.email?.toLowerCase();
    const nombre = payload.name ?? payload.email;
    const googleId = payload.sub;
    if (!correo || !googleId) {
      throw new UnauthorizedException('No se pudo obtener la identidad de Google');
    }

    // Vinculación de cuenta:
    // 1) Por googleId si la cuenta ya fue enlazada antes.
    // 2) Por correo si existe una cuenta previa (email/contraseña) con ese mail:
    //    se enlaza su googleId la primera vez.
    // 3) Alta automática con contraseña aleatoria (el acceso es vía Google).
    let cliente = await this.prisma.cliente.findUnique({ where: { googleId } });
    if (!cliente) {
      const porCorreo = await this.prisma.cliente.findUnique({
        where: { correo },
      });
      if (porCorreo) {
        cliente = porCorreo.googleId
          ? porCorreo
          : await this.prisma.cliente.update({
              where: { id: porCorreo.id },
              data: { googleId },
            });
      } else {
        const password = await bcrypt.hash(randomUUID(), SALT_ROUNDS);
        cliente = await this.prisma.cliente.create({
          data: { correo, nombre: nombre ?? correo, password, googleId },
        });
      }
    }
    return this.tokenCliente(cliente.id, cliente.correo);
  }

  // --- Usuario (panel) ------------------------------------------------------

  async loginUsuario(dto: LoginDto, meta: LoginMeta = {}) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo.toLowerCase() },
    });
    if (!usuario || !(await bcrypt.compare(dto.password, usuario.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    // Registra la sesión activa y la entrada de auditoría (ACCESO).
    await this.prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        dispositivo: meta.userAgent,
        ip: meta.ip,
      },
    });
    await this.auditoria.registrar({
      tipo: TipoActividad.ACCESO,
      descripcion: 'Inicio de sesión en el panel',
      usuarioId: usuario.id,
      ip: meta.ip,
    });

    const payload: JwtPayload = {
      sub: usuario.id,
      correo: usuario.correo,
      tipo: 'usuario',
      rol: usuario.rol,
    };
    return {
      accessToken: this.jwt.sign(payload),
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }

  // --- Helpers --------------------------------------------------------------

  private tokenCliente(id: string, correo: string) {
    const payload: JwtPayload = { sub: id, correo, tipo: 'cliente' };
    return {
      accessToken: this.jwt.sign(payload),
      cliente: { id, correo },
    };
  }
}
