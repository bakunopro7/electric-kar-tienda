import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Registro de un cliente de la tienda. */
export class RegisterDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Juan Pérez' })
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
