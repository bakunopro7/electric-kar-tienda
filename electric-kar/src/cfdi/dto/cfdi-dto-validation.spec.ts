import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EmitirCfdiDto } from './emitir-cfdi.dto';
import { CancelarCfdiDto } from './cancelar-cfdi.dto';
import { MotivoCancelacion } from '../../generated/prisma/client';

async function hasError(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ---------------------------------------------------------------------------
// EmitirCfdiDto — pedidoId
// ---------------------------------------------------------------------------

describe('EmitirCfdiDto — pedidoId', () => {
  const baseValid = {
    receptorNombre: 'Test',
    receptorRfc: 'CARI850912H4A',
    receptorCp: '03100',
    receptorRegimen: '612',
    usoCfdi: 'G03',
    formaPago: '03',
  };

  it('rejects pedidoId = "not-a-uuid"', async () => {
    const dto = plainToInstance(EmitirCfdiDto, {
      ...baseValid,
      pedidoId: 'not-a-uuid',
    });
    expect(await hasError(dto, 'pedidoId')).toBe(true);
  });

  it('accepts a valid UUID v4', async () => {
    const dto = plainToInstance(EmitirCfdiDto, {
      ...baseValid,
      pedidoId: VALID_UUID,
    });
    expect(await hasError(dto, 'pedidoId')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CancelarCfdiDto — uuidSustituye
// ---------------------------------------------------------------------------

describe('CancelarCfdiDto — uuidSustituye', () => {
  it('rejects uuidSustituye = "abc-123" (not a UUID)', async () => {
    const dto = plainToInstance(CancelarCfdiDto, {
      motivoCancelacion: MotivoCancelacion.M01,
      uuidSustituye: 'abc-123',
    });
    expect(await hasError(dto, 'uuidSustituye')).toBe(true);
  });

  it('accepts absent uuidSustituye (optional)', async () => {
    const dto = plainToInstance(CancelarCfdiDto, {
      motivoCancelacion: MotivoCancelacion.M02,
    });
    expect(await hasError(dto, 'uuidSustituye')).toBe(false);
  });

  it('accepts valid UUID for uuidSustituye', async () => {
    const dto = plainToInstance(CancelarCfdiDto, {
      motivoCancelacion: MotivoCancelacion.M01,
      uuidSustituye: VALID_UUID,
    });
    expect(await hasError(dto, 'uuidSustituye')).toBe(false);
  });
});
