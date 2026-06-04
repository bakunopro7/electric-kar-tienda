import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TiempoPreparacion } from '../../generated/prisma/client';

export class ConfigPickupDto {
  @ApiProperty({ example: 'Sucursal Centro' })
  @IsString()
  @MaxLength(120)
  sucursal: string;

  @ApiProperty({ example: 'Av. Juárez 100, Centro' })
  @IsString()
  @MaxLength(200)
  direccion: string;

  @ApiProperty({ example: 'Lun-Vie 9:00-18:00' })
  @IsString()
  @MaxLength(120)
  horario: string;

  @ApiPropertyOptional({ enum: TiempoPreparacion, default: TiempoPreparacion.MISMO_DIA })
  @IsOptional()
  @IsEnum(TiempoPreparacion)
  tiempoPreparacion?: TiempoPreparacion;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  avisoListo?: boolean;
}
