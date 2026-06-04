import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Login compartido (cliente y personal usan el mismo formato de credenciales). */
export class LoginDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}
