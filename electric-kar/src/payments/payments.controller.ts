import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ClienteGuard } from '../common/guards/cliente.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CheckoutDto } from '../orders/dto/checkout.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, ClienteGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear pedido y sesión de pago (Stripe Checkout)' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.payments.checkout(user.id, dto.codigoCupon);
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.payments.handleWebhook(req.rawBody as Buffer, signature);
  }
}
