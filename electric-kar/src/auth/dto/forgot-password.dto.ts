import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { LowerTrim } from '../../common/transforms';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;
}
