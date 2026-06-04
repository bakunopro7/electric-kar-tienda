import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateArticuloDto {
  @ApiProperty({ example: 'como-elegir-bateria' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  slug: string;

  @ApiProperty({ example: 'Cómo elegir la batería correcta' })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiProperty({ example: 'Guías' })
  @IsString()
  @MaxLength(60)
  categoria: string;

  @ApiProperty({ example: 'Resumen del artículo…' })
  @IsString()
  @MaxLength(500)
  resumen: string;

  @ApiProperty({ type: [String], description: 'Párrafos del contenido' })
  @IsArray()
  @IsString({ each: true })
  contenido: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagen?: string;

  @ApiProperty({ example: 'Carlos Téllez' })
  @IsString()
  @MaxLength(120)
  autorNombre: string;

  @ApiPropertyOptional({ example: 'Técnico eléctrico automotriz' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  autorRol?: string;

  @ApiPropertyOptional({ example: '6 min de lectura' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  lectura?: string;

  @ApiPropertyOptional({ example: 'Guía' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  etiqueta?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  destacado?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  publicado?: boolean;
}
