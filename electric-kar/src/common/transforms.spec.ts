import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Trim, LowerTrim } from './transforms';

// ---------------------------------------------------------------------------
// Minimal test classes — one property each so the decorator is exercised in
// isolation via class-transformer's plainToInstance path.
// ---------------------------------------------------------------------------

class WithTrim {
  @Trim()
  value: string | undefined;
}

class WithLowerTrim {
  @LowerTrim()
  value: string | undefined;
}

// ---------------------------------------------------------------------------
// Trim()
// ---------------------------------------------------------------------------

describe('Trim()', () => {
  it('trims leading whitespace', () => {
    const obj = plainToInstance(WithTrim, { value: '  hello' });
    expect(obj.value).toBe('hello');
  });

  it('trims trailing whitespace', () => {
    const obj = plainToInstance(WithTrim, { value: 'hello  ' });
    expect(obj.value).toBe('hello');
  });

  it('trims both ends', () => {
    const obj = plainToInstance(WithTrim, { value: '  hello world  ' });
    expect(obj.value).toBe('hello world');
  });

  it('is a no-op on undefined', () => {
    const obj = plainToInstance(WithTrim, { value: undefined });
    expect(obj.value).toBeUndefined();
  });

  it('is a no-op on null', () => {
    const obj = plainToInstance(WithTrim, { value: null });
    expect(obj.value).toBeNull();
  });

  it('is a no-op on a number', () => {
    const obj = plainToInstance(WithTrim, { value: 42 });
    expect((obj as unknown as { value: unknown }).value).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// LowerTrim()
// ---------------------------------------------------------------------------

describe('LowerTrim()', () => {
  it('lowercases an uppercase string', () => {
    const obj = plainToInstance(WithLowerTrim, { value: 'ADMIN@X.COM' });
    expect(obj.value).toBe('admin@x.com');
  });

  it('trims AND lowercases', () => {
    const obj = plainToInstance(WithLowerTrim, { value: '  ADMIN@X.COM  ' });
    expect(obj.value).toBe('admin@x.com');
  });

  it('is idempotent on already-normalized values', () => {
    const obj = plainToInstance(WithLowerTrim, { value: 'admin@x.com' });
    expect(obj.value).toBe('admin@x.com');
  });

  it('is a no-op on undefined', () => {
    const obj = plainToInstance(WithLowerTrim, { value: undefined });
    expect(obj.value).toBeUndefined();
  });

  it('is a no-op on null', () => {
    const obj = plainToInstance(WithLowerTrim, { value: null });
    expect(obj.value).toBeNull();
  });

  it('is a no-op on a number', () => {
    const obj = plainToInstance(WithLowerTrim, { value: 99 });
    expect((obj as unknown as { value: unknown }).value).toBe(99);
  });
});
