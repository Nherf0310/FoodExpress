import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, UnitType } from '@prisma/client';
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

// Valid manager-triggered status transitions
const MANAGER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PICKING, OrderStatus.CANCELLED],
  [OrderStatus.PICKING]: [OrderStatus.READY_FOR_DELIVERY],
  [OrderStatus.READY_FOR_DELIVERY]: [],
  [OrderStatus.OUT_FOR_DELIVERY]: [],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class StoreManagementService {
  constructor(private prisma: PrismaService) {}

  // ─── Store Profile ───────────────────────────────────────────────────────────

  async getMyStore(managerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { managerId },
      include: { _count: { select: { products: true, orders: true } } },
    });
    if (!store) throw new NotFoundException('No store found for this manager account');
    return store;
  }

  async updateMyStore(managerId: string, dto: UpdateStoreDto) {
    const store = await this.getMyStore(managerId);
    return this.prisma.store.update({
      where: { id: store.id },
      data: dto,
    });
  }

  // ─── Categories ──────────────────────────────────────────────────────────────

  async createCategory(managerId: string, dto: CreateCategoryDto) {
    const store = await this.getMyStore(managerId);
    return this.prisma.category.create({
      data: { storeId: store.id, name: dto.name, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateCategory(managerId: string, categoryId: string, dto: UpdateCategoryDto) {
    const store = await this.getMyStore(managerId);
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, storeId: store.id },
    });
    if (!cat) throw new NotFoundException('Category not found in your store');
    return this.prisma.category.update({ where: { id: categoryId }, data: dto });
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async createProduct(managerId: string, dto: CreateProductDto) {
    const store = await this.getMyStore(managerId);

    // Verify category belongs to store
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, storeId: store.id },
    });
    if (!category) throw new NotFoundException('Category not found in your store');

    return this.prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        brand: dto.brand,
        sku: dto.sku,
        imageUrl: dto.imageUrl,
        price: dto.price,
        unitType: dto.unitType as UnitType,
        unitLabel: dto.unitLabel,
        inventory: {
          create: {
            quantityInStock: dto.initialStock ?? 0,
            lowStockThreshold: dto.lowStockThreshold ?? 10,
          },
        },
      },
      include: { inventory: true, category: true },
    });
  }

  async updateProduct(managerId: string, productId: string, dto: UpdateProductDto) {
    const store = await this.getMyStore(managerId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    });
    if (!product) throw new NotFoundException('Product not found in your store');
    return this.prisma.product.update({
      where: { id: productId },
      data: dto,
      include: { inventory: true, category: true },
    });
  }

  // ─── Inventory ───────────────────────────────────────────────────────────────

  async adjustInventory(managerId: string, productId: string, dto: AdjustInventoryDto) {
    const store = await this.getMyStore(managerId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
      include: { inventory: true },
    });
    if (!product) throw new NotFoundException('Product not found in your store');

    const updateData: any = { quantityInStock: dto.quantityInStock };
    if (dto.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = dto.lowStockThreshold;
    }

    return this.prisma.inventory.update({
      where: { productId },
      data: updateData,
      include: { product: { select: { name: true, unitType: true, unitLabel: true } } },
    });
  }

  async getLowStockProducts(managerId: string) {
    const store = await this.getMyStore(managerId);
    // Prisma doesn't support column-to-column comparisons natively, so fetch all and filter in JS.
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id, isAvailable: true },
      include: { inventory: true, category: true },
      orderBy: { name: 'asc' },
    });
    return products.filter(
      (p) => p.inventory && p.inventory.quantityInStock <= p.inventory.lowStockThreshold,
    );
  }

  // ─── Delivery Slots ───────────────────────────────────────────────────────────

  async createDeliverySlot(managerId: string, dto: CreateDeliverySlotDto) {
    const store = await this.getMyStore(managerId);
    return this.prisma.deliverySlot.create({
      data: {
        storeId: store.id,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        capacity: dto.capacity ?? 10,
        bookedCount: 0,
      },
    });
  }

  // ─── Order Management ─────────────────────────────────────────────────────────

  async getStoreOrders(managerId: string, status?: string) {
    const store = await this.getMyStore(managerId);
    const where: any = { storeId: store.id };
    if (status) where.status = status;

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        address: true,
        deliverySlot: true,
        items: {
          include: {
            product: { select: { id: true, name: true, unitType: true, unitLabel: true, imageUrl: true } },
            substitutedProduct: { select: { id: true, name: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 3 },
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrderStatus(
    managerId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const store = await this.getMyStore(managerId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
    });
    if (!order) throw new NotFoundException('Order not found in your store');

    const newStatus = dto.status as OrderStatus;
    const allowed = MANAGER_TRANSITIONS[order.status] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${newStatus}". Allowed transitions: [${allowed.join(', ') || 'none'}]`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If cancelling by store, restore stock and slot
      if (newStatus === OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantityInStock: { increment: item.quantityOrdered } },
          });
        }
        await tx.deliverySlot.update({
          where: { id: order.deliverySlotId },
          data: { bookedCount: { decrement: 1 } },
        });
      }

      // If moving to PICKING, create a Delivery record so driver can see it soon
      if (newStatus === OrderStatus.CONFIRMED) {
        const existingDelivery = await tx.delivery.findUnique({ where: { orderId } });
        if (!existingDelivery) {
          await tx.delivery.create({
            data: { orderId, status: 'PENDING' },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          statusHistory: {
            create: {
              status: newStatus,
              changedByUserId: managerId,
              notes: dto.notes ?? `Status updated to ${newStatus} by store manager`,
            },
          },
        },
        include: {
          items: true,
          customer: { select: { id: true, name: true, email: true } },
          delivery: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      return updated;
    });
  }

  async fulfillOrderItem(
    managerId: string,
    orderId: string,
    itemId: string,
    dto: FulfillOrderItemDto,
  ) {
    const store = await this.getMyStore(managerId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found in your store');

    if (order.status !== OrderStatus.PICKING) {
      throw new BadRequestException(
        `Can only update item fulfillment while order is in PICKING status. Current status: "${order.status}"`,
      );
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Order item not found');

    // If substituting, verify substitute product belongs to store
    if (dto.substitutedProductId) {
      const sub = await this.prisma.product.findFirst({
        where: { id: dto.substitutedProductId, storeId: store.id, isAvailable: true },
      });
      if (!sub) throw new NotFoundException('Substitute product not found in your store');
    }

    // Determine the effective unit price for line total recalculation
    let effectiveUnitPrice = item.unitPrice;
    let effectiveUnitType = item.unitType;

    if (dto.substitutedProductId) {
      const subProduct = await this.prisma.product.findUnique({
        where: { id: dto.substitutedProductId },
      });
      if (subProduct) {
        effectiveUnitPrice = subProduct.price;
        effectiveUnitType = subProduct.unitType;
      }
    }

    // Recalculate line total using actual fulfilled quantity
    let newLineTotal = 0;
    if (effectiveUnitType === UnitType.WEIGHT) {
      newLineTotal = Math.round((effectiveUnitPrice * dto.quantityFulfilled) / 1000);
    } else {
      newLineTotal = effectiveUnitPrice * dto.quantityFulfilled;
    }

    // Update item and recalculate order total
    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          quantityFulfilled: dto.quantityFulfilled,
          substitutedProductId: dto.substitutedProductId ?? item.substitutedProductId,
          lineTotal: newLineTotal,
        },
      });

      // Recalculate whole order subtotal from all items' current lineTotals
      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const newSubtotal = allItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const newTotal = newSubtotal + order.deliveryFee;

      await tx.order.update({
        where: { id: orderId },
        data: { itemSubtotal: newSubtotal, total: newTotal },
      });

      return {
        updatedItem,
        newSubtotal,
        deliveryFee: order.deliveryFee,
        newTotal,
      };
    });
  }
}
