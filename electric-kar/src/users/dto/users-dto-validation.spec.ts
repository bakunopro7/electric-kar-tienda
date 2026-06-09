import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { Rol } from '../../generated/prisma/client';

async function hasError(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

describe('CreateUserDto — correo', () => {
  const baseValid = { nombre: 'Test', password: 'pass123', rol: Rol.VENDEDOR };

  it('rejects correo > 254 chars', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...baseValid,
      correo: 'a'.repeat(246) + '@test.com', // 255 chars
    });
    expect(await hasError(dto, 'correo')).toBe(true);
  });

  it('normalizes correo: uppercase → lowercased', () => {
    const dto = plainToInstance(CreateUserDto, {
      ...baseValid,
      correo: 'ADMIN@ELECTRICK-KAR.MX',
    });
    expect(dto.correo).toBe('admin@electrick-kar.mx');
  });
});
