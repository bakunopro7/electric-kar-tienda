import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID token de Google (credential)' })
  @IsString()
  @MaxLength(4096)
  idToken: string;
}
