import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID token de Google (credential)' })
  @IsString()
  idToken: string;
}
