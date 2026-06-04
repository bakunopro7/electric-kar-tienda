import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCupon, Prisma, TipoCupon } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCuponDto } from './dto/create-cupon.dto';
import { UpdateCuponDto } from './dto/update-cupon.dto';
import { ValidateCuponDto } from './dto/validate-cupon.dto';

@Injectable()
export class CuponesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCuponDto) {
    try {
      return await this.prisma.cupon.create({
        data: {
          ...dto,
          fechaInicio: new Date(dto.fechaInicio),
          fechaFin: new Date(dto.fechaFin),
        },
      });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  findAll() {
    return this.prisma.cupon.findMany({ orderBy: { creadoEn: 'desc' } });
  }

  async findOne(id: string) {
    const cupon = await this.prisma.cupon.findUnique({ where: { id } });
    if (!cupon) {
      throw new NotFoundException('Cupón no encontrado');
    }
    return cupon;
  }

  async update(id: string, dto: UpdateCuponDto) {
    await this.findOne(id);
    const data: Prisma.CuponUncheckedUpdateInput = { ...dto };
    if (dto.fechaInicio) data.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin) data.fechaFin = new Date(dto.fechaFin);
    try {
      return await this.prisma.cupon.update({ where: { id }, data });
    } catch (error) {
      throw this.handleKnownErrors(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.cupon.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Comprueba la validez de un cupón para un subtotal dado y calcula el
   * descuento aplicable. No incrementa el contador de usos (eso ocurre al
   * confirmar el pedido).
   */
  async validate(dto: ValidateCuponDto) {
    const cupon = await this.prisma.cupon.findUnique({
      where: { codigo: dto.codigo },
    });
    if (!cupon) {
      throw new NotFoundException('Cupón no encontrado');
    }

    const ahora = new Date();
    if (cupon.estado === EstadoCupon.EXPIRADO || ahora > cupon.fechaFin) {
      throw new BadRequestException('El cupón ha expirado');
    }
    if (ahora < cupon.fechaInicio) {
      throw new BadRequestException('El cupón aún no está vigente');
    }
    if (cupon.limiteTotal !== null && cupon.usos >= cupon.limiteTotal) {
      throw new BadRequestException('El cupón ha alcanzado su límite de usos');
    }

    const subtotal = new Prisma.Decimal(dto.subtotal);
    if (subtotal.lessThan(cupon.compraMinima)) {
      throw new BadRequestException(
        `Compra mínima de ${cupon.compraMinima.toString()} no alcanzada`,
      );
    }

    let descuento = new Prisma.Decimal(0);
    let envioGratis = false;
    switch (cupon.tipo) {
      case TipoCupon.PORCENTAJE:
        descuento = subtotal.mul(cupon.valor).div(100);
        break;
      case TipoCupon.MONTO_FIJO:
        descuento = Prisma.Decimal.min(cupon.valor, subtotal);
        break;
      case TipoCupon.ENVIO_GRATIS:
        envioGratis = true;
        break;
    }

    return {
      cuponId: cupon.id,
      codigo: cupon.codigo,
      tipo: cupon.tipo,
      descuento,
      envioGratis,
    };
  }

  // --- Helpers --------------------------------------------------------------

  private handleKnownErrors(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Ya existe un cupón con ese código');
    }
    return error as Error;
  }
}
