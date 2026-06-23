import { Body, Controller, Get, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Rol, TipoActividad } from '../../generated/prisma/client';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { CsdService } from './csd.service';
import { UploadCsdDto } from '../dto/upload-csd.dto';

/** Gestión del Certificado de Sello Digital (CSD). Solo SUPER. */
@ApiTags('cfdi')
@ApiBearerAuth()
@Roles(Rol.SUPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cfdi/csd')
export class CsdController {
  constructor(
    private readonly csd: CsdService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Post()
  @SkipAudit()
  @ApiOperation({ summary: 'Cargar el Certificado de Sello Digital (CSD)' })
  async cargar(
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Body() dto: UploadCsdDto,
  ) {
    const csd = await this.csd.cargar(dto);
    await this.auditoria
      .registrar({
        tipo: TipoActividad.FISCAL,
        descripcion: `Cargó CSD ${csd.noCertificado} (${csd.modo})`,
        usuarioId: user.id,
        ip,
      })
      .catch(() => undefined);
    return csd;
  }

  @Get()
  @ApiOperation({ summary: 'Estado de los CSD activos' })
  estado() {
    return this.csd.estado();
  }
}
