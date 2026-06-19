import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { ContenidoService } from './contenido.service';
import { UpdateDatosContactoDto } from './dto/update-datos-contacto.dto';

@ApiTags('contenido')
@Controller('contenido')
export class ContenidoController {
  constructor(private readonly contenidoService: ContenidoService) {}

  @Get('features')
  @ApiOperation({ summary: 'Listar features activas del home' })
  findFeatures() {
    return this.contenidoService.findFeatures();
  }

  @Get('promo')
  @ApiOperation({ summary: 'Obtener la promo activa más reciente del home' })
  findPromo() {
    return this.contenidoService.findPromo();
  }

  @Get('contacto')
  @ApiOperation({ summary: 'Datos de contacto del sitio (público)' })
  findContacto() {
    return this.contenidoService.findContacto();
  }

  @Patch('contacto')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar los datos de contacto del sitio (admin)' })
  updateContacto(@Body() dto: UpdateDatosContactoDto) {
    return this.contenidoService.updateContacto(dto);
  }
}
