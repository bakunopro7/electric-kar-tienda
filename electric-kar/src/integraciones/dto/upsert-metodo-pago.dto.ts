import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpsertMetodoPagoDto {
  @ApiProperty({ example: 'card', description: 'card / spei / oxxo / pickup' })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ example: 'Tarjeta de crédito/débito' })
  @IsString()
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({ example: '3.6% + $3' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  comision?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Id de la integración (procesador)' })
  @IsOptional()
  @IsUUID()
  proveedorId?: string;
}
