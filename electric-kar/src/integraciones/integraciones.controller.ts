import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol, TipoIntegracion } from '../generated/prisma/client';
import { ConfigPickupDto } from './dto/config-pickup.dto';
import { CreateIntegracionDto } from './dto/create-integracion.dto';
import { UpdateIntegracionDto } from './dto/update-integracion.dto';
import { UpsertMetodoPagoDto } from './dto/upsert-metodo-pago.dto';
import { IntegracionesService } from './integraciones.service';

@ApiTags('integraciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integraciones')
export class IntegracionesController {
  constructor(private readonly service: IntegracionesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.CONTADOR)
  @ApiOperation({ summary: 'Listar integraciones (opcional ?tipo=)' })
  findAll(@Query('tipo') tipo?: TipoIntegracion) {
    return this.service.findAll(tipo);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.CONTADOR)
  @ApiOperation({ summary: 'Obtener una integración' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.SUPER)
  @ApiOperation({ summary: 'Crear una integración (solo Super admin)' })
  create(@Body() dto: CreateIntegracionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.SUPER)
  @ApiOperation({ summary: 'Actualizar una integración (solo Super admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateIntegracionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.SUPER)
  @ApiOperation({ summary: 'Eliminar una integración (solo Super admin)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@ApiTags('metodos-pago')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metodos-pago')
export class MetodosPagoController {
  constructor(private readonly service: IntegracionesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @ApiOperation({ summary: 'Listar métodos de pago' })
  list() {
    return this.service.listMetodosPago();
  }

  @Put()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @ApiOperation({ summary: 'Crear o actualizar un método de pago (por código)' })
  upsert(@Body() dto: UpsertMetodoPagoDto) {
    return this.service.upsertMetodoPago(dto);
  }
}

@ApiTags('config-pickup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('config-pickup')
export class ConfigPickupController {
  constructor(private readonly service: IntegracionesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @ApiOperation({ summary: 'Obtener la configuración de Pick up' })
  get() {
    return this.service.getConfigPickup();
  }

  @Put()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @ApiOperation({ summary: 'Guardar la configuración de Pick up' })
  set(@Body() dto: ConfigPickupDto) {
    return this.service.setConfigPickup(dto);
  }
}
