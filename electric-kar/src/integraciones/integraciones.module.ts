import { Module } from '@nestjs/common';
import {
  ConfigPickupController,
  IntegracionesController,
  MetodosPagoController,
} from './integraciones.controller';
import { IntegracionesService } from './integraciones.service';

@Module({
  controllers: [
    IntegracionesController,
    MetodosPagoController,
    ConfigPickupController,
  ],
  providers: [IntegracionesService],
  exports: [IntegracionesService],
})
export class IntegracionesModule {}
