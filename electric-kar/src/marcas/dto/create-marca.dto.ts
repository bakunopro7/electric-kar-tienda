import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMarcaDto {
  @ApiProperty({ example: 'LTH' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre: string;

  @ApiProperty({ example: 'lth' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug: string;
}
