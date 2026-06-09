import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LowerTrim, Trim } from '../../common/transforms';

/** Registro de un cliente de la tienda. */
export class RegisterDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @Trim()
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional({ example: '55 1234 5678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ example: 'CARI850912H4A', description: 'RFC para facturación' })
  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;
}
