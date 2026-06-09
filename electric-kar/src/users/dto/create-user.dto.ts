import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Rol } from '../../generated/prisma/client';
import { LowerTrim } from '../../common/transforms';

/** Alta de un usuario del panel (personal). */
export class CreateUserDto {
  @ApiProperty({ example: 'Roberto Méndez' })
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'roberto@electrick-kar.mx' })
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @ApiProperty({ enum: Rol, example: Rol.VENDEDOR })
  @IsEnum(Rol)
  rol: Rol;
}
