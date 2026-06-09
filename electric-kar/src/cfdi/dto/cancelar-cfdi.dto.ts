import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MotivoCancelacion } from '../../generated/prisma/client';

export class CancelarCfdiDto {
  @ApiProperty({
    enum: MotivoCancelacion,
    example: MotivoCancelacion.M02,
    description: 'M01..M04 (01 con relación, 02 sin relación, 03 no se realizó, 04 global)',
  })
  @IsEnum(MotivoCancelacion)
  motivoCancelacion: MotivoCancelacion;

  @ApiPropertyOptional({ description: 'Folio fiscal que sustituye (motivo M01)' })
  @IsOptional()
  @IsUUID()
  uuidSustituye?: string;
}
