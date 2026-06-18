import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductIndexService } from './search/product-index.service';
import { TypesenseService } from './search/typesense.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, TypesenseService, ProductIndexService],
  exports: [ProductsService],
})
export class ProductsModule {}
