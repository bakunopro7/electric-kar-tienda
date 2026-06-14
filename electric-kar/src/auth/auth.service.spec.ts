import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

async function makeService(
  prisma: any,
  jwt: any,
  auditoria: any,
): Promise<AuthService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: prisma },
      { provide: JwtService, useValue: jwt },
      { provide: AuditoriaService, useValue: auditoria },
    ],
  }).compile();
  return moduleRef.get(AuthService);
}

describe('AuthService', () => {
  let prisma: any;
  let jwt: any;
  let auditoria: any;
  let service: AuthService;

  beforeEach(async () => {
    prisma = {
      cliente: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      usuario: { findUnique: jest.fn(), update: jest.fn() },
      sesion: { create: jest.fn() },
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    auditoria = { registrar: jest.fn() };
    service = await makeService(prisma, jwt, auditoria);
  });

  describe('registerCliente', () => {
    it('rechaza un correo ya registrado', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cli-1' });
      await expect(
        service.registerCliente({
          correo: 'a@b.c',
          password: 'secret123',
          nombre: 'Ana',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('crea el cliente con la contraseña hasheada y devuelve token', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);
      prisma.cliente.create.mockResolvedValue({ id: 'cli-1', correo: 'a@b.c' });

      const res = await service.registerCliente({
        correo: 'a@b.c',
        password: 'secret123',
        nombre: 'Ana',
      });

      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.cliente).toEqual({ id: 'cli-1', correo: 'a@b.c' });

      const data = prisma.cliente.create.mock.calls[0][0].data;
      expect(data.password).not.toBe('secret123');
      await expect(bcrypt.compare('secret123', data.password)).resolves.toBe(
        true,
      );
    });
  });

  describe('loginCliente', () => {
    it('rechaza credenciales inválidas (correo inexistente)', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);
      await expect(
        service.loginCliente({ correo: 'a@b.c', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza una contraseña incorrecta', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-1',
        correo: 'a@b.c',
        password: await bcrypt.hash('correcta', 10),
      });
      await expect(
        service.loginCliente({ correo: 'a@b.c', password: 'incorrecta' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('devuelve token con credenciales válidas', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-1',
        correo: 'a@b.c',
        password: await bcrypt.hash('secret123', 10),
      });
      const res = await service.loginCliente({
        correo: 'a@b.c',
        password: 'secret123',
      });
      expect(res.accessToken).toBe('signed.jwt.token');
    });
  });

  describe('forgotPassword', () => {
    it('devuelve un mensaje genérico sin token si el correo no existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);
      const res: any = await service.forgotPassword('nadie@b.c');
      expect(res.mensaje).toBeDefined();
      expect(res.token).toBeUndefined();
      expect(prisma.cliente.update).not.toHaveBeenCalled();
    });

    it('genera y persiste un token cuando el correo existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cli-1' });
      const res: any = await service.forgotPassword('a@b.c');
      expect(res.token).toBeDefined();
      const data = prisma.cliente.update.mock.calls[0][0].data;
      expect(data.resetToken).toBe(res.token);
      expect(data.resetTokenExpira.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('resetPassword', () => {
    it('rechaza un token inexistente', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword('tok', 'nueva123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un token expirado', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-1',
        resetToken: 'tok',
        resetTokenExpira: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword('tok', 'nueva123')).rejects.toThrow(
        /inválido o expirado/,
      );
    });

    it('actualiza la contraseña y limpia el token', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-1',
        resetToken: 'tok',
        resetTokenExpira: new Date(Date.now() + 60_000),
      });
      await service.resetPassword('tok', 'nueva123');
      const data = prisma.cliente.update.mock.calls[0][0].data;
      expect(data.resetToken).toBeNull();
      expect(data.resetTokenExpira).toBeNull();
      await expect(bcrypt.compare('nueva123', data.password)).resolves.toBe(
        true,
      );
    });
  });

  describe('loginUsuario', () => {
    it('rechaza credenciales inválidas', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(
        service.loginUsuario({ correo: 'admin@b.c', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('registra sesión y auditoría en un login válido', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u-1',
        correo: 'admin@b.c',
        nombre: 'Admin',
        rol: 'SUPER',
        password: await bcrypt.hash('admin123', 10),
      });
      const res = await service.loginUsuario(
        { correo: 'admin@b.c', password: 'admin123' },
        { ip: '1.2.3.4', userAgent: 'jest' },
      );
      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.usuario.rol).toBe('SUPER');
      expect(prisma.sesion.create).toHaveBeenCalled();
      expect(auditoria.registrar).toHaveBeenCalled();
      // El payload firmado incluye tipo 'usuario' y el rol
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'usuario', rol: 'SUPER' }),
      );
    });
  });
});
