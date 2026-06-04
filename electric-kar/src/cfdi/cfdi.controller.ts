import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipAudit } from '../common/decorators/skip-audit.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol, TipoActividad } from '../generated/prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CfdiService } from './cfdi.service';
import { CancelarCfdiDto } from './dto/cancelar-cfdi.dto';
import { ComplementoPagoDto } from './dto/complemento-pago.dto';
import { EmitirCfdiDto } from './dto/emitir-cfdi.dto';

/** Facturación electrónica (CFDI 4.0). Acceso del personal fiscal. */
@ApiTags('cfdi')
@ApiBearerAuth()
@Roles(Rol.CONTADOR, Rol.ADMIN, Rol.SUPER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cfdi')
export class CfdiController {
  constructor(
    private readonly cfdiService: CfdiService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Post('emitir')
  @SkipAudit()
  @ApiOperation({ summary: 'Emitir un CFDI a partir de un pedido' })
  async emitir(
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Body() dto: EmitirCfdiDto,
  ) {
    const cfdi = await this.cfdiService.emitir(dto);
    await this.log(user, ip, `Emitió CFDI ${cfdi.id} (pedido ${dto.pedidoId})`);
    return cfdi;
  }

  @Post(':id/timbrar')
  @SkipAudit()
  @ApiOperation({ summary: 'Timbrar un CFDI (simulado)' })
  async timbrar(
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Param('id') id: string,
  ) {
    const cfdi = await this.cfdiService.timbrar(id);
    await this.log(user, ip, `Timbró CFDI ${id} (UUID ${cfdi.uuidFiscal})`);
    return cfdi;
  }

  @Post(':id/cancelar')
  @SkipAudit()
  @Roles(Rol.CONTADOR, Rol.SUPER)
  @ApiOperation({ summary: 'Cancelar un CFDI timbrado' })
  async cancelar(
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Param('id') id: string,
    @Body() dto: CancelarCfdiDto,
  ) {
    const cfdi = await this.cfdiService.cancelar(id, dto);
    await this.log(user, ip, `Canceló CFDI ${id} (motivo ${dto.motivoCancelacion})`);
    return cfdi;
  }

  @Post(':id/pagos')
  @SkipAudit()
  @ApiOperation({ summary: 'Registrar un complemento de pago (REP) para un CFDI PPD' })
  async registrarPago(
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Param('id') id: string,
    @Body() dto: ComplementoPagoDto,
  ) {
    const cfdi = await this.cfdiService.registrarPago(id, dto);
    await this.log(user, ip, `Registró pago (REP) en CFDI ${id}`);
    return cfdi;
  }

  @Get()
  @ApiOperation({ summary: 'Listar comprobantes' })
  findAll() {
    return this.cfdiService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un comprobante' })
  findOne(@Param('id') id: string) {
    return this.cfdiService.findOne(id);
  }

  private log(user: AuthUser, ip: string, descripcion: string) {
    return this.auditoria
      .registrar({
        tipo: TipoActividad.FISCAL,
        descripcion,
        usuarioId: user.id,
        ip,
      })
      .catch(() => undefined);
  }
}
