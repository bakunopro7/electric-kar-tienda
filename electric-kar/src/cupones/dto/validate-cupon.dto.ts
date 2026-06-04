import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class ValidateCuponDto {
  @ApiProperty({ example: 'VERANO20' })
  @IsString()
  @MaxLength(40)
  codigo: string;

  @ApiProperty({ example: 1500.0, description: 'Subtotal del carrito' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subtotal: number;
}
