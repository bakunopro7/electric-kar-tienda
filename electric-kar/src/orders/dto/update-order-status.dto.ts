import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EstadoPedido } from '../../generated/prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: EstadoPedido, example: EstadoPedido.PREPARACION })
  @IsEnum(EstadoPedido)
  estado: EstadoPedido;
}
