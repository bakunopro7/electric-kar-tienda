import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT = 'skipAudit';

/**
 * Excluye un endpoint del registro automático de auditoría (interceptor).
 * Úsalo en acciones que se registran manualmente con más detalle (login, CFDI).
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT, true);
