import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  async listStores(@Query('openOnly') openOnly?: string) {
    return this.storesService.listApprovedStores(openOnly === 'true');
  }

  @Get(':id')
  async getStore(@Param('id') id: string) {
    return this.storesService.getStoreById(id);
  }

  @Get(':id/categories')
  async getCategories(@Param('id') id: string) {
    return this.storesService.getCategories(id);
  }

  @Get(':id/products')
  async getProducts(
    @Param('id') id: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('inStockOnly') inStockOnly?: string,
  ) {
    return this.storesService.getProducts(id, {
      categoryId,
      search,
      inStockOnly: inStockOnly === 'true',
    });
  }

  @Get(':id/delivery-slots')
  async getDeliverySlots(@Param('id') id: string) {
    return this.storesService.getDeliverySlots(id);
  }
}
