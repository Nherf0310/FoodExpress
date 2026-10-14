import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { ProductsController } from '../catalog/products.controller';

@Module({
  controllers: [StoresController, ProductsController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
