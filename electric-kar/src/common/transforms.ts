import { Transform } from 'class-transformer';

/**
 * Trims surrounding whitespace from a string value.
 * No-op for non-string values (undefined/null/optional fields), so it is safe
 * to stack above @IsOptional() without coercing absent fields.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

/**
 * Trims and lowercases a string value. Use on every `correo`/email field to make
 * the case-sensitive Postgres unique index behave case-insensitively and to block
 * the duplicate-identity bypass (ADMIN@X.COM vs admin@x.com).
 * No-op for non-string values.
 */
export function LowerTrim(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
