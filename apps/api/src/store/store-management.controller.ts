import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoreManagementService } from './store-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  UpdateStoreDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  AdjustInventoryDto,
  CreateDeliverySlotDto,
  UpdateOrderStatusDto,
  FulfillOrderItemDto,
} from './dto/store-management.dto';

@Controller('store')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STORE_MANAGER)
export class StoreManagementController {
  constructor(private readonly svc: StoreManagementService) {}

  // ─── Store Profile ────────────────────────────────────────────────────────────

  @Get('me')
  getMyStore(@Request() req: any) {
    return this.svc.getMyStore(req.user.id);
  }

  @Patch('me')
  updateMyStore(@Request() req: any, @Body() dto: UpdateStoreDto) {
    return this.svc.updateMyStore(req.user.id, dto);
  }

  // ─── Categories ───────────────────────────────────────────────────────────────

  @Post('categories')
  createCategory(@Request() req: any, @Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(req.user.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.svc.updateCategory(req.user.id, id, dto);
  }

  // ─── Products ─────────────────────────────────────────────────────────────────

  @Post('products')
  createProduct(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.svc.createProduct(req.user.id, dto);
  }

  @Patch('products/:id')
  updateProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.svc.updateProduct(req.user.id, id, dto);
  }

  // ─── Inventory ────────────────────────────────────────────────────────────────

  @Patch('inventory/:productId')
  adjustInventory(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.svc.adjustInventory(req.user.id, productId, dto);
  }

  @Get('inventory/low-stock')
  getLowStockProducts(@Request() req: any) {
    return this.svc.getLowStockProducts(req.user.id);
  }

  // ─── Delivery Slots ───────────────────────────────────────────────────────────

  @Post('delivery-slots')
  createDeliverySlot(@Request() req: any, @Body() dto: CreateDeliverySlotDto) {
    return this.svc.createDeliverySlot(req.user.id, dto);
  }

  // ─── Order Management ─────────────────────────────────────────────────────────

  @Get('orders')
  getStoreOrders(@Request() req: any, @Query('status') status?: string) {
    return this.svc.getStoreOrders(req.user.id, status);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.svc.updateOrderStatus(req.user.id, id, dto);
  }

  @Patch('orders/:id/items/:itemId')
  fulfillOrderItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: FulfillOrderItemDto,
  ) {
    return this.svc.fulfillOrderItem(req.user.id, id, itemId, dto);
  }
}
