import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Registro de un pago (Complemento de Pago / REP 2.0) para un CFDI PPD. */
export class ComplementoPagoDto {
  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  @IsDateString()
  fechaPago: string;

  @ApiProperty({ example: '03', description: 'c_FormaPago' })
  @IsString()
  @MaxLength(4)
  formaPago: string;

  @ApiProperty({ example: 1700.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto: number;

  @ApiPropertyOptional({ example: 'MXN', default: 'MXN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @ApiPropertyOptional({ example: '012180001234567895' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  clabeOrdenante?: string;

  @ApiPropertyOptional({ example: 'BBVA' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bancoEmisor?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcialidad?: number;

  @ApiProperty({ example: 3398.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  saldoAnterior: number;

  @ApiProperty({ example: 1698.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  saldoInsoluto: number;
}
