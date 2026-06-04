import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoUsuario, Rol } from '../../generated/prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Roberto Méndez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @ApiPropertyOptional({ enum: EstadoUsuario })
  @IsOptional()
  @IsEnum(EstadoUsuario)
  estado?: EstadoUsuario;
}
