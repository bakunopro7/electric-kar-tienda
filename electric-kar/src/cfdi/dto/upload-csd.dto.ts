import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsEnum, IsString, MinLength } from 'class-validator';
import { ModoIntegracion } from '../../generated/prisma/client';

/**
 * Carga de un Certificado de Sello Digital (CSD). Los archivos .cer y .key se
 * envían codificados en base64; la contraseña abre la llave privada.
 */
export class UploadCsdDto {
  @ApiProperty({ description: 'Archivo .cer (DER) en base64' })
  @IsBase64()
  cerBase64: string;

  @ApiProperty({ description: 'Archivo .key (PKCS#8 DER) en base64' })
  @IsBase64()
  keyBase64: string;

  @ApiProperty({ description: 'Contraseña de la llave privada' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({ enum: ModoIntegracion, example: ModoIntegracion.PRUEBAS })
  @IsEnum(ModoIntegracion)
  modo: ModoIntegracion;
}
