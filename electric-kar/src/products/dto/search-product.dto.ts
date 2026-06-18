import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../common/transforms';

/**
 * Query DTO for the public `GET /products/search` endpoint (Typesense-backed).
 *
 * NOTE: there is intentionally NO `estado` parameter — the public
 * `estado = PUBLICADO` filter is enforced server-side only and can never be
 * overridden by the client.
 */
export class SearchProductDto {
  @ApiPropertyOptional({ description: 'Texto de búsqueda (nombre, SKU, etc.)' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría' })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por marca' })
  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por una o más etiquetas',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : value,
  )
  @IsArray()
  @IsString({ each: true })
  etiquetas?: string[];

  @ApiPropertyOptional({
    description: 'Orden de resultados',
    enum: ['relevancia', 'precio_asc', 'precio_desc', 'recientes'],
  })
  @IsOptional()
  @Trim()
  @IsIn(['relevancia', 'precio_asc', 'precio_desc', 'recientes'])
  sort?: 'relevancia' | 'precio_asc' | 'precio_desc' | 'recientes';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}
