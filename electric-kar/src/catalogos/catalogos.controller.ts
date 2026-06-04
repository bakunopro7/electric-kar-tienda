import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { CatalogosService } from './catalogos.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

@ApiTags('catalogos')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  // --- Lectura pública (para selects/badges) -------------------------------

  @Get()
  @ApiOperation({ summary: 'Catálogo genérico (opcional ?tipo=)' })
  listar(@Query('tipo') tipo?: string) {
    return this.catalogos.listar(tipo);
  }

  @Get('tipos')
  @ApiOperation({ summary: 'Tipos de catálogo genérico disponibles' })
  tipos() {
    return this.catalogos.tipos();
  }

  @Get('sat')
  @ApiOperation({ summary: 'Catálogos SAT (opcional ?tipo=)' })
  listarSat(@Query('tipo') tipo?: string) {
    return this.catalogos.listarSat(tipo);
  }

  @Get('sat/tipos')
  @ApiOperation({ summary: 'Tipos de catálogo SAT disponibles' })
  tiposSat() {
    return this.catalogos.tiposSat();
  }

  // --- Gestión del catálogo genérico (personal) ----------------------------

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear entrada de catálogo (personal)' })
  crear(@Body() dto: CreateCatalogoDto) {
    return this.catalogos.crear(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar entrada de catálogo (personal)' })
  actualizar(@Param('id') id: string, @Body() dto: UpdateCatalogoDto) {
    return this.catalogos.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar entrada de catálogo (personal)' })
  eliminar(@Param('id') id: string) {
    return this.catalogos.eliminar(id);
  }
}
