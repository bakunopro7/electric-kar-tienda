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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClienteGuard } from '../common/guards/cliente.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { ClientesService } from './clientes.service';
import { CreateDireccionDto } from './dto/create-direccion.dto';
import { QueryClientesDto } from './dto/query-clientes.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { UpdateDireccionDto } from './dto/update-direccion.dto';
import { UpdateSegmentoDto } from './dto/update-segmento.dto';

@ApiTags('clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  // --- Perfil propio del cliente -------------------------------------------

  @Get('me')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Mi perfil (cliente)' })
  me(@CurrentUser() user: AuthUser) {
    return this.clientesService.findOne(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Actualizar mi perfil (cliente)' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateClienteDto) {
    return this.clientesService.updateProfile(user.id, dto);
  }

  // --- Mis direcciones ------------------------------------------------------

  @Get('me/direcciones')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Listar mis direcciones' })
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.clientesService.listAddresses(user.id);
  }

  @Post('me/direcciones')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Añadir una dirección' })
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateDireccionDto) {
    return this.clientesService.addAddress(user.id, dto);
  }

  @Patch('me/direcciones/:direccionId')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Actualizar una dirección' })
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('direccionId') direccionId: string,
    @Body() dto: UpdateDireccionDto,
  ) {
    return this.clientesService.updateAddress(user.id, direccionId, dto);
  }

  @Delete('me/direcciones/:direccionId')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiOperation({ summary: 'Eliminar una dirección' })
  removeAddress(
    @CurrentUser() user: AuthUser,
    @Param('direccionId') direccionId: string,
  ) {
    return this.clientesService.removeAddress(user.id, direccionId);
  }

  // --- Gestión (personal del panel) ----------------------------------------
  // IMPORTANT: 'top' and 'stats' MUST be declared BEFORE '/:id' to prevent
  // NestJS from matching the literal strings "top" and "stats" as :id values.

  @Get()
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.VENDEDOR, Rol.CONTADOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Listar clientes con paginación (personal)' })
  findAll(@Query() dto: QueryClientesDto) {
    return this.clientesService.findAll(dto.page, dto.limit);
  }

  @Get('top')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Top clientes por totalGastado (personal)' })
  findTop(@Query('limit') limit?: string) {
    return this.clientesService.findTop(limit ? Number(limit) : undefined);
  }

  @Get('stats')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Estadísticas de clientes: total (personal)' })
  stats() {
    return this.clientesService.stats();
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.VENDEDOR, Rol.CONTADOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener un cliente con sus direcciones (personal)' })
  findOne(@Param('id') id: string) {
    return this.clientesService.findOneWithAddresses(id);
  }

  @Patch(':id/segmento')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Cambiar el segmento de un cliente (personal)' })
  updateSegmento(@Param('id') id: string, @Body() dto: UpdateSegmentoDto) {
    return this.clientesService.updateSegmento(id, dto);
  }
}
