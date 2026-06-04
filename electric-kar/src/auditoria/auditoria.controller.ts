import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol, TipoActividad } from '../generated/prisma/client';
import { AuditoriaService } from './auditoria.service';

@ApiTags('auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles(Rol.SUPER)
  @ApiOperation({ summary: 'Bitácora de actividad (Super admin)' })
  findAll(
    @Query('tipo') tipo?: TipoActividad,
    @Query('usuarioId') usuarioId?: string,
  ) {
    return this.auditoriaService.findAll({ tipo, usuarioId });
  }

  @Get('me')
  @Roles(Rol.CONTADOR, Rol.SUPER)
  @ApiOperation({ summary: 'Mis acciones registradas' })
  mine(@CurrentUser() user: AuthUser) {
    return this.auditoriaService.findForUsuario(user.id);
  }
}
