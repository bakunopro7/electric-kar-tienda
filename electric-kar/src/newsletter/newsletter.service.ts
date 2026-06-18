import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un correo en la lista de captación. Es IDEMPOTENTE: si el correo ya
   * está suscrito no falla ni duplica. Devuelve `nuevo` para que el front pueda
   * dar el mensaje correcto ("te suscribiste" vs "ya estabas suscrito").
   * Esta lista es la base sobre la que más adelante se dispersarán los cupones.
   */
  async suscribir(
    dto: SubscribeNewsletterDto,
  ): Promise<{ ok: true; nuevo: boolean }> {
    try {
      await this.prisma.suscriptor.create({ data: { correo: dto.correo } });
      this.logger.log(`Nuevo suscriptor captado: ${dto.correo}`);
      return { ok: true, nuevo: true };
    } catch (error) {
      // P2002 = violación de índice único -> el correo ya estaba suscrito.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { ok: true, nuevo: false };
      }
      throw error;
    }
  }
}
