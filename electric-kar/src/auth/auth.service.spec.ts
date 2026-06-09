// Mock google-auth-library before any imports to prevent bignumber.js
// resolution issues with the jest moduleNameMapper in this project.
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  cliente: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  sesion: {
    create: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('signed-token') };
const mockAuditoria = { registrar: jest.fn() };
const mockConfig = { get: jest.fn(), getOrThrow: jest.fn() };

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditoriaService, useValue: mockAuditoria },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // registerCliente
  // -------------------------------------------------------------------------

  describe('registerCliente', () => {
    it('throws ConflictException (HTTP 409) for duplicate normalized email', async () => {
      // existing user stored as admin@x.com; incoming email is ADMIN@X.COM
      mockPrisma.cliente.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.registerCliente({
          correo: 'ADMIN@X.COM',
          password: 'pass123',
          nombre: 'Admin',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('calls findUnique with lowercased correo', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValue(null);
      mockPrisma.cliente.create.mockResolvedValue({
        id: 'new-id',
        correo: 'admin@x.com',
      });

      await service.registerCliente({
        correo: 'ADMIN@X.COM',
        password: 'pass123',
        nombre: 'Admin',
      } as any);

      expect(mockPrisma.cliente.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ correo: 'admin@x.com' }),
        }),
      );
    });

    it('stores the normalized (lowercased) correo on create', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValue(null);
      mockPrisma.cliente.create.mockResolvedValue({
        id: 'new-id',
        correo: 'admin@x.com',
      });

      await service.registerCliente({
        correo: 'ADMIN@X.COM',
        password: 'pass123',
        nombre: 'Admin',
      } as any);

      expect(mockPrisma.cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ correo: 'admin@x.com' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // loginCliente
  // -------------------------------------------------------------------------

  describe('loginCliente', () => {
    it('calls findUnique with lowercased correo', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValue(null);

      await expect(
        service.loginCliente({ correo: 'ADMIN@X.COM', password: 'pass' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockPrisma.cliente.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ correo: 'admin@x.com' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // loginUsuario
  // -------------------------------------------------------------------------

  describe('loginUsuario', () => {
    it('calls findUnique with lowercased correo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.loginUsuario({ correo: 'PANEL@X.COM', password: 'pass' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ correo: 'panel@x.com' }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // forgotPassword
  // -------------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('calls findUnique with lowercased correo', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValue(null);

      await service.forgotPassword('USER@EXAMPLE.COM');

      expect(mockPrisma.cliente.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ correo: 'user@example.com' }),
        }),
      );
    });
  });
});
