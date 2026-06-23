import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertDatosFiscalesDto } from './upsert-datos-fiscales.dto';

async function hasError(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

const baseValid = {
  razonSocial: 'Juan Pérez García',
  rfc: 'PEGJ850912H4A',
  cpFiscal: '03100',
  regimenFiscal: '612',
  usoCfdi: 'G03',
};

describe('UpsertDatosFiscalesDto', () => {
  it('acepta datos fiscales válidos', async () => {
    const dto = plainToInstance(UpsertDatosFiscalesDto, baseValid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rechaza un RFC con formato inválido', async () => {
    const dto = plainToInstance(UpsertDatosFiscalesDto, { ...baseValid, rfc: 'NO-ES-RFC' });
    expect(await hasError(dto, 'rfc')).toBe(true);
  });

  it('normaliza el RFC a mayúsculas y sin espacios antes de validar', async () => {
    const dto = plainToInstance(UpsertDatosFiscalesDto, { ...baseValid, rfc: '  pegj850912h4a  ' });
    expect(await hasError(dto, 'rfc')).toBe(false);
    expect(dto.rfc).toBe('PEGJ850912H4A');
  });

  it('acepta un RFC de persona moral (12 caracteres)', async () => {
    const dto = plainToInstance(UpsertDatosFiscalesDto, { ...baseValid, rfc: 'EKA210345XY8' });
    expect(await hasError(dto, 'rfc')).toBe(false);
  });

  it('rechaza un CP que no tiene 5 dígitos', async () => {
    const dto = plainToInstance(UpsertDatosFiscalesDto, { ...baseValid, cpFiscal: '123' });
    expect(await hasError(dto, 'cpFiscal')).toBe(true);
  });
});
