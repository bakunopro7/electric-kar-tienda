import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Baterías' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombre: string;

  @ApiProperty({ example: 'baterias' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ example: 'Baterías y acumuladores automotrices' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
