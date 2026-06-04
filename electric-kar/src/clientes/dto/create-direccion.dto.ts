import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDireccionDto {
  @ApiProperty({ example: 'Av. Insurgentes Sur 1234' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  calle: string;

  @ApiPropertyOptional({ example: 'Depto 4B' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  interior?: string;

  @ApiPropertyOptional({ example: 'Del Valle' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  colonia?: string;

  @ApiProperty({ example: '03100' })
  @IsString()
  @MaxLength(10)
  cp: string;

  @ApiPropertyOptional({ example: 'Ciudad de México' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ciudad?: string;

  @ApiPropertyOptional({ example: 'CDMX' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  estado?: string;
}
