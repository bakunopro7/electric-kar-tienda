import { Module } from '@nestjs/common';
import { CfdiController } from './cfdi.controller';
import { CfdiService } from './cfdi.service';
import { CsdController } from './csd/csd.controller';
import { CsdService } from './csd/csd.service';
import { FacturapiProvider } from './facturapi/facturapi.provider';

@Module({
  controllers: [CfdiController, CsdController],
  providers: [CfdiService, CsdService, FacturapiProvider],
  exports: [CfdiService, CsdService],
})
export class CfdiModule {}
