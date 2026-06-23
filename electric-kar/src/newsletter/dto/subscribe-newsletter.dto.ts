import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { LowerTrim } from '../../common/transforms';

/**
 * Body DTO for the public `POST /newsletter` endpoint (captación de correos).
 * `LowerTrim` normaliza el correo (minúsculas + trim) para que el índice único
 * de Postgres se comporte como case-insensitive y no entren duplicados.
 */
export class SubscribeNewsletterDto {
  @ApiProperty({ description: 'Correo del suscriptor', example: 'tu@correo.com' })
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;
}
