import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContenidoService } from './contenido.service';

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
}
