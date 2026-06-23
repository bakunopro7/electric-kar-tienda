import { Module } from '@nestjs/common';
import { CfdiController } from './cfdi.controller';
import { CfdiService } from './cfdi.service';
import { CsdController } from './csd/csd.controller';
import { CsdService } from './csd/csd.service';

@Module({
  controllers: [CfdiController, CsdController],
  providers: [CfdiService, CsdService],
  exports: [CfdiService, CsdService],
})
export class CfdiModule {}
