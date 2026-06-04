import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Rol } from '../generated/prisma/client';
import { BlogService } from './blog.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  // --- Público --------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Artículos publicados (opcional ?categoria=)' })
  listar(@Query('categoria') categoria?: string) {
    return this.blog.listarPublicados(categoria);
  }

  @Get('destacado')
  @ApiOperation({ summary: 'Artículo destacado' })
  destacado() {
    return this.blog.destacado();
  }

  // --- Gestión (personal) ---------------------------------------------------

  @Get('all')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Todos los artículos (personal)' })
  todos() {
    return this.blog.listarTodos();
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear artículo (personal)' })
  crear(@Body() dto: CreateArticuloDto) {
    return this.blog.crear(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar artículo (personal)' })
  actualizar(@Param('id') id: string, @Body() dto: UpdateArticuloDto) {
    return this.blog.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.SUPER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar artículo (personal)' })
  eliminar(@Param('id') id: string) {
    return this.blog.eliminar(id);
  }

  // --- Detalle público (debe ir al final por el comodín :slug) -------------

  @Get(':slug')
  @ApiOperation({ summary: 'Artículo por slug (público)' })
  porSlug(@Param('slug') slug: string) {
    return this.blog.porSlug(slug);
  }
}
