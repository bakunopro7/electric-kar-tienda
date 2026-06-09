import {
  Body,
  Controller,
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
import { CheckoutDto } from './dto/checkout.dto';
import { QueryClientOrdersDto } from './dto/query-client-orders.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(ClienteGuard)
  @ApiOperation({ summary: 'Crear un pedido a partir del carrito (cliente)' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.id, dto.codigoCupon);
  }

  @Get()
  @UseGuards(ClienteGuard)
  @ApiOperation({ summary: 'Mis pedidos (cliente)' })
  myOrders(@CurrentUser() user: AuthUser, @Query() dto: QueryClientOrdersDto) {
    return this.ordersService.findAllForCliente(user.id, dto.page, dto.limit);
  }

  @Get('all')
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.VENDEDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Listar todos los pedidos con paginación (personal)' })
  findAll(@Query() dto: QueryOrdersDto) {
    return this.ordersService.findAll(dto.page, dto.limit, dto.estado);
  }

  @Get('stats')
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.VENDEDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Estadísticas de pedidos: ventas, conteo, ticket promedio' })
  getStats() {
    return this.ordersService.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver un pedido (propio si cliente; cualquiera si personal)' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Rol.ADMIN, Rol.SUPER, Rol.VENDEDOR)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Actualizar el estado de un pedido (personal)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
