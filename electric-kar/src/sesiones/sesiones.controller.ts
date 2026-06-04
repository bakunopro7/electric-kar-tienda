import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { SesionesService } from './sesiones.service';

/** Sesiones activas del personal — solo Super admin. */
@ApiTags('sesiones')
@ApiBearerAuth()
@Roles(Rol.SUPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sesiones')
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sesiones activas' })
  findActivas() {
    return this.sesionesService.findActivas();
  }

  @Delete()
  @ApiOperation({ summary: 'Cerrar todas las sesiones activas' })
  cerrarTodas() {
    return this.sesionesService.cerrarTodas();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cerrar una sesión' })
  cerrar(@Param('id') id: string) {
    return this.sesionesService.cerrar(id);
  }
}
