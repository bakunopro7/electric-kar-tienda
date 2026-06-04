import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SegmentoCliente } from '../../generated/prisma/client';

/** Cambio de segmento del cliente (personal del panel). */
export class UpdateSegmentoDto {
  @ApiProperty({ enum: SegmentoCliente, example: SegmentoCliente.FRECUENTE })
  @IsEnum(SegmentoCliente)
  segmento: SegmentoCliente;
}
