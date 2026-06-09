import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  MetodoPagoSat,
  TipoComprobante,
} from '../../generated/prisma/client';

/**
 * Emite un CFDI a partir de un pedido. Los conceptos (líneas) se generan
 * automáticamente desde las líneas del pedido.
 */
export class EmitirCfdiDto {
  @ApiProperty({ description: 'Id del pedido a facturar' })
  @IsUUID()
  pedidoId: string;

  @ApiProperty({ example: 'Carlos Ríos' })
  @IsString()
  @MaxLength(160)
  receptorNombre: string;

  @ApiProperty({ example: 'CARI850912H4A' })
  @IsString()
  @MaxLength(13)
  receptorRfc: string;

  @ApiProperty({ example: '03100' })
  @IsString()
  @MaxLength(10)
  receptorCp: string;

  @ApiProperty({ example: '612', description: 'c_RegimenFiscal' })
  @IsString()
  @MaxLength(10)
  receptorRegimen: string;

  @ApiProperty({ example: 'G03', description: 'c_UsoCFDI' })
  @IsString()
  @MaxLength(10)
  usoCfdi: string;

  @ApiProperty({ example: '03', description: 'c_FormaPago (01,03,04,28,99)' })
  @IsString()
  @MaxLength(4)
  formaPago: string;

  @ApiPropertyOptional({ enum: MetodoPagoSat, default: MetodoPagoSat.PUE })
  @IsOptional()
  @IsEnum(MetodoPagoSat)
  metodoPago?: MetodoPagoSat;

  @ApiPropertyOptional({ enum: TipoComprobante, default: TipoComprobante.I })
  @IsOptional()
  @IsEnum(TipoComprobante)
  tipoComprobante?: TipoComprobante;
}
