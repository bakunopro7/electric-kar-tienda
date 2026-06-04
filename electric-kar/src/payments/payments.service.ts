import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Crea el pedido a partir del carrito y, si Stripe está configurado, abre
   * una sesión de Checkout (tarjeta + OXXO). Devuelve la URL de pago o, en
   * modo demo (sin llaves), el pedido creado para ir directo a confirmación.
   */
  async checkout(clienteId: string, codigoCupon?: string) {
    const pedido = await this.orders.checkout(clienteId, codigoCupon);
    const folio = pedido.folio ?? pedido.id;

    if (!this.stripe.isConfigured()) {
      return { pedidoId: pedido.id, folio, url: null, stripe: false };
    }

    const front = this.config.get<string>('APP_FRONT_URL', 'http://localhost:4200');
    const session = await this.stripe.client.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'oxxo'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'mxn',
            unit_amount: Math.round(Number(pedido.total) * 100),
            product_data: { name: `Pedido ${folio}` },
          },
        },
      ],
      success_url: `${front}/confirmacion?folio=${folio}&pago=ok`,
      cancel_url: `${front}/checkout?pago=cancelado`,
      metadata: { pedidoId: pedido.id },
      locale: 'es',
    });

    await this.prisma.pedido.update({
      where: { id: pedido.id },
      data: { stripeSessionId: session.id },
    });

    return { pedidoId: pedido.id, folio, url: session.url, stripe: true };
  }

  /** Verifica la firma del webhook y marca el pedido como pagado. */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!this.stripe.isConfigured() || !secret) {
      throw new BadRequestException('Webhook de Stripe no configurado');
    }

    let event: { type: string; data: { object: unknown } };
    try {
      event = this.stripe.client.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.error(`Firma de webhook inválida: ${(err as Error).message}`);
      throw new BadRequestException('Firma de webhook inválida');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: Record<string, string | undefined> | null;
      };
      const pedidoId = session.metadata?.['pedidoId'];
      if (pedidoId) {
        await this.prisma.pedido.update({
          where: { id: pedidoId },
          data: { pagado: true },
        });
        this.logger.log(`Pedido ${pedidoId} marcado como pagado`);
      }
    }

    return { received: true };
  }
}
