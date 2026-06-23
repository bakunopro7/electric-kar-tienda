import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { Trim, UpperTrim } from '../../common/transforms';

// RFC del SAT: 3 letras (moral) o 4 (física) + 6 dígitos de fecha + 3 de homoclave.
const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;

/**
 * Datos fiscales del receptor para CFDI 4.0. La razón social debe coincidir
 * EXACTAMENTE con la Constancia de Situación Fiscal o el SAT rechaza el timbrado.
 */
export class UpsertDatosFiscalesDto {
  @ApiProperty({ example: 'Juan Pérez García' })
  @Trim()
  @IsString()
  @MaxLength(254)
  razonSocial: string;

  @ApiProperty({ example: 'PEGJ850912H4A' })
  @UpperTrim()
  @Matches(RFC_REGEX, { message: 'El RFC no tiene un formato válido' })
  rfc: string;

  @ApiProperty({ example: '03100' })
  @Trim()
  @Matches(/^\d{5}$/, { message: 'El código postal debe tener 5 dígitos' })
  cpFiscal: string;

  @ApiProperty({ example: '612', description: 'c_RegimenFiscal del SAT' })
  @Trim()
  @IsString()
  @MaxLength(5)
  regimenFiscal: string;

  @ApiProperty({ example: 'G03', description: 'c_UsoCFDI del SAT' })
  @UpperTrim()
  @IsString()
  @MaxLength(5)
  usoCfdi: string;
}
