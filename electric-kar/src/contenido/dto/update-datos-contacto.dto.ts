import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { LowerTrim, Trim } from '../../common/transforms';

/**
 * Body DTO para actualizar los datos de contacto del sitio (admin).
 * Singleton: el endpoint hace upsert de la única fila.
 */
export class UpdateDatosContactoDto {
  @ApiProperty({ example: 'Av. Tecnología 1200, CDMX' })
  @Trim()
  @IsString()
  @MaxLength(200)
  direccion: string;

  @ApiProperty({ example: '55 1234 5678' })
  @Trim()
  @IsString()
  @MaxLength(40)
  telefono: string;

  @ApiProperty({ example: 'hola@electrick-kar.com' })
  @LowerTrim()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @ApiProperty({ example: 'Lun a Sáb · 9:00 - 19:00' })
  @Trim()
  @IsString()
  @MaxLength(120)
  horario: string;
}
