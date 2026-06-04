import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCatalogoDto {
  @ApiProperty({ example: 'ESTADO_PEDIDO' })
  @IsString()
  @MaxLength(60)
  tipo: string;

  @ApiProperty({ example: 'NUEVO' })
  @IsString()
  @MaxLength(60)
  clave: string;

  @ApiProperty({ example: 'Nuevo' })
  @IsString()
  @MaxLength(80)
  etiqueta: string;

  @ApiPropertyOptional({ example: '#2f74ff' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
