import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un cliente de la tienda' })
  register(@Body() dto: RegisterDto) {
    return this.authService.registerCliente(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login de cliente (tienda)' })
  login(@Body() dto: LoginDto) {
    return this.authService.loginCliente(dto);
  }

  @Post('staff/login')
  @ApiOperation({ summary: 'Login de personal del panel' })
  staffLogin(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.loginUsuario(dto, { ip, userAgent });
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña (cliente)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.correo);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token (cliente)' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Principal autenticado (cliente o usuario)' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
