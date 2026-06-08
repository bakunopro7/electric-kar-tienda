import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Envuelve el SDK de Stripe. Si no hay STRIPE_SECRET_KEY configurada, queda
 * "no configurado" y los endpoints de pago lo informan en lugar de romper.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe.Stripe | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
    if (!this.stripe) {
      this.logger.warn('Stripe no configurado (STRIPE_SECRET_KEY vacío).');
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  get client(): Stripe.Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Pagos no configurados: falta STRIPE_SECRET_KEY en el servidor',
      );
    }
    return this.stripe;
  }
}
