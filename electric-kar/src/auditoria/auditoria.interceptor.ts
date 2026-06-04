import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { SKIP_AUDIT } from '../common/decorators/skip-audit.decorator';
import { TipoActividad } from '../generated/prisma/client';
import { AuditoriaService } from './auditoria.service';

interface AuditableRequest {
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  user?: AuthUser;
}

const TIPO_POR_METODO: Record<string, TipoActividad> = {
  POST: TipoActividad.CREAR,
  PATCH: TipoActividad.EDITAR,
  PUT: TipoActividad.EDITAR,
  DELETE: TipoActividad.ELIMINAR,
};

/**
 * Registra automáticamente las acciones de escritura realizadas por el
 * personal del panel. Las rutas marcadas con `@SkipAudit()` se omiten (se
 * auditan manualmente con más detalle).
 */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuditableRequest>();
    const tipo = TIPO_POR_METODO[req.method];

    return next.handle().pipe(
      tap(() => {
        // Solo acciones de escritura del personal, no marcadas para omitir.
        if (skip || !tipo) return;
        const user = req.user;
        if (!user || user.tipo !== 'usuario') return;

        void this.auditoria
          .registrar({
            tipo,
            descripcion: `${req.method} ${req.originalUrl ?? req.url}`,
            usuarioId: user.id,
            ip: req.ip,
          })
          // La auditoría nunca debe romper la petición principal.
          .catch(() => undefined);
      }),
    );
  }
}
