import { Controller, Get, Param } from '@nestjs/common';
import { StoresService } from '../stores/stores.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly storesService: StoresService) {}

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.storesService.getProductById(id);
  }
}
