import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  EstadoIntegracion,
  ModoIntegracion,
  TipoIntegracion,
} from '../../generated/prisma/client';

export class CreateIntegracionDto {
  @ApiProperty({ enum: TipoIntegracion, example: TipoIntegracion.PASARELA })
  @IsEnum(TipoIntegracion)
  tipo: TipoIntegracion;

  @ApiProperty({ example: 'Stripe' })
  @IsString()
  @MaxLength(80)
  proveedor: string;

  @ApiPropertyOptional({ enum: ModoIntegracion, default: ModoIntegracion.PRUEBAS })
  @IsOptional()
  @IsEnum(ModoIntegracion)
  modo?: ModoIntegracion;

  @ApiPropertyOptional({ description: 'Llaves/credenciales (se almacenan como JSON)' })
  @IsOptional()
  @IsObject()
  credenciales?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'https://api.tienda.mx/webhooks/stripe' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  webhookUrl?: string;

  @ApiPropertyOptional({ enum: EstadoIntegracion })
  @IsOptional()
  @IsEnum(EstadoIntegracion)
  estado?: EstadoIntegracion;

  @ApiPropertyOptional({ description: 'Ajustes específicos del proveedor (JSON)' })
  @IsOptional()
  @IsObject()
  opciones?: Record<string, unknown>;
}
