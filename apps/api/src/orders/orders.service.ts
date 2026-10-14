import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderStatus,
  UnitType,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // 1. Verify Store
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store || !store.isApproved) {
      throw new NotFoundException('Store not found or not approved');
    }
    if (!store.isOpen) {
      throw new BadRequestException('Store is currently closed and not accepting orders');
    }

    // 2. Verify Address belongs to customer
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId: customerId },
    });
    if (!address) {
      throw new NotFoundException('Delivery address not found or does not belong to you');
    }

    // 3. Verify Delivery Slot
    const slot = await this.prisma.deliverySlot.findUnique({
      where: { id: dto.deliverySlotId },
    });
    if (!slot || slot.storeId !== dto.storeId) {
      throw new NotFoundException('Delivery slot not found for this store');
    }
    if (slot.bookedCount >= slot.capacity) {
      throw new BadRequestException('The selected delivery slot is fully booked. Please select another slot.');
    }

    // 4. Fetch Products and validate Stock & Pricing
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: dto.storeId,
        isAvailable: true,
      },
      include: {
        inventory: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable or do not belong to this store');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Prepare line item snapshots and calculate subtotal
    let itemSubtotal = 0;
    const itemsToCreate: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
      unitType: UnitType;
      unitLabel: string;
      quantityOrdered: number;
      quantityFulfilled: number;
      lineTotal: number;
    }> = [];

    for (const itemInput of dto.items) {
      const product = productMap.get(itemInput.productId)!;
      const stock = product.inventory?.quantityInStock ?? 0;

      if (stock < itemInput.quantity) {
        const availableDisplay =
          product.unitType === UnitType.WEIGHT
            ? `${(stock / 1000).toFixed(2)} kg`
            : `${stock} units`;
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${availableDisplay}, Requested: ${itemInput.quantity}`,
        );
      }

      // Calculate line total in cents
      let lineTotal = 0;
      if (product.unitType === UnitType.WEIGHT) {
        // Price is in cents per 1000 grams
        lineTotal = Math.round((product.price * itemInput.quantity) / 1000);
      } else {
        lineTotal = product.price * itemInput.quantity;
      }

      itemSubtotal += lineTotal;

      itemsToCreate.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        unitType: product.unitType,
        unitLabel: product.unitLabel,
        quantityOrdered: itemInput.quantity,
        quantityFulfilled: itemInput.quantity,
        lineTotal,
      });
    }

    // 5. Check Minimum Order Amount
    if (itemSubtotal < store.minOrderAmount) {
      throw new BadRequestException(
        `Order subtotal of $${(itemSubtotal / 100).toFixed(2)} does not meet the store minimum of $${(store.minOrderAmount / 100).toFixed(2)}`,
      );
    }

    const deliveryFee = store.deliveryFee;
    const total = itemSubtotal + deliveryFee;

    // 6. Execute Atomic Transaction: Decrement stock, reserve slot, create order & history
    return this.prisma.$transaction(async (tx) => {
      // a. Decrement inventory
      for (const item of itemsToCreate) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantityInStock: {
              decrement: item.quantityOrdered,
            },
          },
        });
      }

      // b. Reserve delivery slot capacity
      await tx.deliverySlot.update({
        where: { id: slot.id },
        data: {
          bookedCount: {
            increment: 1,
          },
        },
      });

      // c. Create Order record
      const order = await tx.order.create({
        data: {
          customerId,
          storeId: dto.storeId,
          addressId: dto.addressId,
          deliverySlotId: dto.deliverySlotId,
          status: OrderStatus.PENDING,
          substitutionPreference: dto.substitutionPreference,
          customerNotes: dto.customerNotes,
          itemSubtotal,
          deliveryFee,
          total,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: itemsToCreate,
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              changedByUserId: customerId,
              notes: 'Order placed by customer (Cash on delivery)',
            },
          },
        },
        include: {
          items: true,
          store: {
            select: { id: true, name: true, phone: true, address: true },
          },
          address: true,
          deliverySlot: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return order;
    });
  }

  async listCustomerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
        store: {
          select: { id: true, name: true, phone: true, imageUrl: true },
        },
        deliverySlot: true,
        delivery: {
          include: {
            driver: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string, userRole: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            substitutedProduct: true,
          },
        },
        store: true,
        address: true,
        deliverySlot: true,
        delivery: {
          include: {
            driver: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // Role ownership verification:
    // Customers can only view their own orders
    if (userRole === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    // Store managers can only view orders from their store
    if (userRole === UserRole.STORE_MANAGER) {
      const store = await this.prisma.store.findFirst({
        where: { id: order.storeId, managerId: userId },
      });
      if (!store) {
        throw new ForbiddenException('You do not manage the store associated with this order');
      }
    }

    return order;
  }

  async cancelOrder(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Allowed cancellation states: PENDING or CONFIRMED
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}". Order picking or delivery has already commenced.`,
      );
    }

    // Transactionally restore stock and slot, and mark cancelled
    return this.prisma.$transaction(async (tx) => {
      // 1. Restore inventory
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantityInStock: {
              increment: item.quantityOrdered,
            },
          },
        });
      }

      // 2. Decrement slot bookedCount
      await tx.deliverySlot.update({
        where: { id: order.deliverySlotId },
        data: {
          bookedCount: {
            decrement: 1,
          },
        },
      });

      // 3. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          statusHistory: {
            create: {
              status: OrderStatus.CANCELLED,
              changedByUserId: customerId,
              notes: 'Order cancelled by customer before picking',
            },
          },
        },
        include: {
          items: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return updatedOrder;
    });
  }
}
