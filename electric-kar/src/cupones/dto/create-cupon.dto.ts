import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AplicaCupon, EstadoCupon, TipoCupon } from '../../generated/prisma/client';

export class CreateCuponDto {
  @ApiProperty({ example: 'VERANO20' })
  @IsString()
  @MaxLength(40)
  codigo: string;

  @ApiProperty({ enum: TipoCupon, example: TipoCupon.PORCENTAJE })
  @IsEnum(TipoCupon)
  tipo: TipoCupon;

  @ApiProperty({ example: 20, description: '% o monto según el tipo' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor: number;

  @ApiPropertyOptional({ example: 999.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compraMinima?: number;

  @ApiPropertyOptional({ example: 500, description: 'Usos máximos globales' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limiteTotal?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limitePorCliente?: number;

  @ApiPropertyOptional({ enum: AplicaCupon, default: AplicaCupon.TIENDA })
  @IsOptional()
  @IsEnum(AplicaCupon)
  aplicaA?: AplicaCupon;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  soloPrimeraCompra?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  noAcumulable?: boolean;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z' })
  @IsDateString()
  fechaFin: string;

  @ApiPropertyOptional({ enum: EstadoCupon, default: EstadoCupon.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoCupon)
  estado?: EstadoCupon;
}
