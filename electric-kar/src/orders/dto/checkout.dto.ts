import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional({ example: 'VERANO20', description: 'Código de cupón a aplicar' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigoCupon?: string;
}
