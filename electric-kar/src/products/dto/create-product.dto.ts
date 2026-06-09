import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ClaseEnvio, EstadoProducto } from '../../generated/prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Batería AGM 12V 70Ah Heavy Duty' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ example: 'BAT-AGM-70' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  sku: string;

  @ApiPropertyOptional({ example: '7500000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoBarras?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcionCorta?: string;

  @ApiPropertyOptional({ description: 'Id de la categoría' })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional({ description: 'Id de la marca' })
  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @ApiProperty({ example: 2499.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio: number;

  @ApiPropertyOptional({ example: 2990.0, description: 'Precio anterior (tachado)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioComparativo?: number;

  @ApiPropertyOptional({ example: 1680.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo?: number;

  @ApiPropertyOptional({ example: 16, description: 'Tasa de IVA (16 / 8 / 0)', default: 16 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tasaIva?: number;

  @ApiPropertyOptional({ example: 4, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  existencias?: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  seguirInventario?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  permitirSinStock?: boolean;

  @ApiPropertyOptional({ example: '26111702', description: 'Clave SAT (c_ClaveProdServ)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  claveProdSat?: string;

  @ApiPropertyOptional({ example: 18.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  pesoKg?: number;

  @ApiPropertyOptional({ enum: ClaseEnvio, default: ClaseEnvio.ESTANDAR })
  @IsOptional()
  @IsEnum(ClaseEnvio)
  claseEnvio?: ClaseEnvio;

  @ApiPropertyOptional({ enum: EstadoProducto, default: EstadoProducto.BORRADOR })
  @IsOptional()
  @IsEnum(EstadoProducto)
  estado?: EstadoProducto;

  @ApiPropertyOptional({ type: [String], example: ['12V', 'heavy duty'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  etiquetas?: string[];

  @ApiPropertyOptional({ type: [String], description: 'URLs (1ª = principal)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  imagenes?: string[];
}
