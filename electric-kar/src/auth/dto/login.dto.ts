import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { LowerTrim } from '../../common/transforms';

/** Login compartido (cliente y personal usan el mismo formato de credenciales). */
export class LoginDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
