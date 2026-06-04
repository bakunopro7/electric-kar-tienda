import { PartialType } from '@nestjs/swagger';
import { CreateIntegracionDto } from './create-integracion.dto';

export class UpdateIntegracionDto extends PartialType(CreateIntegracionDto) {}
