import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de recuperación' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'nuevaPassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
