import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { MarcasService } from './marcas.service';

@ApiTags('marcas')
@Controller('marcas')
export class MarcasController {
  constructor(private readonly marcasService: MarcasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar marcas' })
  findAll() {
    return this.marcasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una marca' })
  findOne(@Param('id') id: string) {
    return this.marcasService.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una marca (personal)' })
  create(@Body() dto: CreateMarcaDto) {
    return this.marcasService.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar una marca (personal)' })
  update(@Param('id') id: string, @Body() dto: UpdateMarcaDto) {
    return this.marcasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una marca (personal)' })
  remove(@Param('id') id: string) {
    return this.marcasService.remove(id);
  }
}
