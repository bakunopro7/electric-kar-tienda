import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { GoogleLoginDto } from './google-login.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hasError(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

// ---------------------------------------------------------------------------
// LoginDto
// ---------------------------------------------------------------------------

describe('LoginDto — correo', () => {
  it('rejects correo > 254 chars', async () => {
    const raw = { correo: 'a'.repeat(246) + '@test.com', password: 'pass123' };
    // 246 + 9 = 255
    const dto = plainToInstance(LoginDto, raw);
    expect(await hasError(dto, 'correo')).toBe(true);
  });

  it('normalizes correo: "  ADMIN@X.COM " → "admin@x.com"', () => {
    const dto = plainToInstance(LoginDto, {
      correo: '  ADMIN@X.COM ',
      password: 'pass123',
    });
    expect(dto.correo).toBe('admin@x.com');
  });
});

describe('LoginDto — password', () => {
  it('rejects password > 72 chars', async () => {
    const dto = plainToInstance(LoginDto, {
      correo: 'a@b.com',
      password: 'x'.repeat(73),
    });
    expect(await hasError(dto, 'password')).toBe(true);
  });

  it('accepts password at cap (72 chars)', async () => {
    const dto = plainToInstance(LoginDto, {
      correo: 'a@b.com',
      password: 'x'.repeat(72),
    });
    expect(await hasError(dto, 'password')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RegisterDto — correo
// ---------------------------------------------------------------------------

describe('RegisterDto — correo', () => {
  it('rejects correo > 254 chars', async () => {
    const raw = {
      correo: 'a'.repeat(246) + '@test.com', // 255 chars
      password: 'pass123',
      nombre: 'Test',
    };
    const dto = plainToInstance(RegisterDto, raw);
    expect(await hasError(dto, 'correo')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ForgotPasswordDto
// ---------------------------------------------------------------------------

describe('ForgotPasswordDto — correo', () => {
  it('normalizes correo: untrimmed uppercase → normalized', () => {
    const dto = plainToInstance(ForgotPasswordDto, {
      correo: '  USER@EXAMPLE.COM  ',
    });
    expect(dto.correo).toBe('user@example.com');
  });
});

// ---------------------------------------------------------------------------
// ResetPasswordDto — token
// ---------------------------------------------------------------------------

describe('ResetPasswordDto — token', () => {
  it('rejects token > 256 chars', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'x'.repeat(257),
      password: 'pass123',
    });
    expect(await hasError(dto, 'token')).toBe(true);
  });

  it('accepts token at cap (256 chars)', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'x'.repeat(256),
      password: 'pass123',
    });
    expect(await hasError(dto, 'token')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GoogleLoginDto — idToken
// ---------------------------------------------------------------------------

describe('GoogleLoginDto — idToken', () => {
  it('rejects idToken > 4096 chars', async () => {
    const dto = plainToInstance(GoogleLoginDto, {
      idToken: 'x'.repeat(4097),
    });
    expect(await hasError(dto, 'idToken')).toBe(true);
  });

  it('accepts idToken at cap (4096 chars)', async () => {
    const dto = plainToInstance(GoogleLoginDto, {
      idToken: 'x'.repeat(4096),
    });
    expect(await hasError(dto, 'idToken')).toBe(false);
  });
});
