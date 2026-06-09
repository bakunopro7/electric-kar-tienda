import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryProductDto } from './query-product.dto';
import { CreateProductDto } from './create-product.dto';

async function hasError(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

// ---------------------------------------------------------------------------
// QueryProductDto — search
// ---------------------------------------------------------------------------

describe('QueryProductDto — search', () => {
  it('rejects search > 200 chars', async () => {
    const dto = plainToInstance(QueryProductDto, {
      search: 'x'.repeat(201),
    });
    expect(await hasError(dto, 'search')).toBe(true);
  });

  it('accepts search at cap (200 chars)', async () => {
    const dto = plainToInstance(QueryProductDto, {
      search: 'x'.repeat(200),
    });
    expect(await hasError(dto, 'search')).toBe(false);
  });

  it('accepts absent search (optional)', async () => {
    const dto = plainToInstance(QueryProductDto, {});
    expect(await hasError(dto, 'search')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreateProductDto — etiquetas / imagenes
// ---------------------------------------------------------------------------

describe('CreateProductDto — etiquetas', () => {
  const base = { nombre: 'Test', sku: 'SKU-1', precio: 100 };

  it('rejects etiquetas with an item > 100 chars', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...base,
      etiquetas: ['ok', 'x'.repeat(101)],
    });
    expect(await hasError(dto, 'etiquetas')).toBe(true);
  });

  it('accepts etiquetas with items at cap (100 chars)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...base,
      etiquetas: ['x'.repeat(100)],
    });
    expect(await hasError(dto, 'etiquetas')).toBe(false);
  });
});

describe('CreateProductDto — imagenes', () => {
  const base = { nombre: 'Test', sku: 'SKU-1', precio: 100 };

  it('rejects imagenes with an item > 512 chars', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...base,
      imagenes: ['x'.repeat(513)],
    });
    expect(await hasError(dto, 'imagenes')).toBe(true);
  });

  it('accepts imagenes with items at cap (512 chars)', async () => {
    const dto = plainToInstance(CreateProductDto, {
      ...base,
      imagenes: ['x'.repeat(512)],
    });
    expect(await hasError(dto, 'imagenes')).toBe(false);
  });
});
