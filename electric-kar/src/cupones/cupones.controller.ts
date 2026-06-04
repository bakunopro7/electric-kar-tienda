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
import { ClienteGuard } from '../common/guards/cliente.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { CuponesService } from './cupones.service';
import { CreateCuponDto } from './dto/create-cupon.dto';
import { UpdateCuponDto } from './dto/update-cupon.dto';
import { ValidateCuponDto } from './dto/validate-cupon.dto';

@ApiTags('cupones')
@ApiBearerAuth()
@Controller('cupones')
export class CuponesController {
  constructor(private readonly cuponesService: CuponesService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Validar un cupón y calcular el descuento (cliente)' })
  validate(@Body() dto: ValidateCuponDto) {
    return this.cuponesService.validate(dto);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Crear un cupón (personal)' })
  create(@Body() dto: CreateCuponDto) {
    return this.cuponesService.create(dto);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Listar cupones (personal)' })
  findAll() {
    return this.cuponesService.findAll();
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener un cupón (personal)' })
  findOne(@Param('id') id: string) {
    return this.cuponesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Actualizar un cupón (personal)' })
  update(@Param('id') id: string, @Body() dto: UpdateCuponDto) {
    return this.cuponesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Eliminar un cupón (personal)' })
  remove(@Param('id') id: string) {
    return this.cuponesService.remove(id);
  }
}
