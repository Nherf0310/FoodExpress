import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

const DRIVER_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.PENDING]: [DeliveryStatus.ASSIGNED],
  [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
  [DeliveryStatus.PICKED_UP]: [DeliveryStatus.DELIVERED],
  [DeliveryStatus.DELIVERED]: [],
  [DeliveryStatus.CANCELLED]: [],
};

@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) {}

  /**
   * List available deliveries ready for pickup that have not been assigned to any driver.
   */
  async getAvailableDeliveries() {
    return this.prisma.delivery.findMany({
      where: {
        driverId: null,
        status: DeliveryStatus.PENDING,
        order: {
          status: OrderStatus.READY_FOR_DELIVERY,
        },
      },
      include: {
        order: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                imageUrl: true,
              },
            },
            address: true,
            deliverySlot: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unitType: true,
                    unitLabel: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get the driver's current active delivery (ASSIGNED or PICKED_UP).
   */
  async getActiveDelivery(driverId: string) {
    return this.prisma.delivery.findFirst({
      where: {
        driverId,
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP] },
      },
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, email: true },
            },
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                imageUrl: true,
              },
            },
            address: true,
            deliverySlot: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unitType: true,
                    unitLabel: true,
                    imageUrl: true,
                  },
                },
                substitutedProduct: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
  }

  /**
   * Get the driver's delivery history (DELIVERED).
   */
  async getDeliveryHistory(driverId: string) {
    return this.prisma.delivery.findMany({
      where: {
        driverId,
        status: DeliveryStatus.DELIVERED,
      },
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, name: true },
            },
            store: {
              select: { id: true, name: true },
            },
            address: true,
          },
        },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Driver accepts an available delivery.
   */
  async acceptDelivery(driverId: string, deliveryId: string) {
    // Check if driver already has an ongoing active delivery
    const existingActive = await this.prisma.delivery.findFirst({
      where: {
        driverId,
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP] },
      },
    });
    if (existingActive) {
      throw new BadRequestException(
        'You already have an active delivery in progress. Complete it before accepting another.',
      );
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.driverId !== null || delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('This delivery is no longer available');
    }

    if (delivery.order.status !== OrderStatus.READY_FOR_DELIVERY) {
      throw new BadRequestException(
        `Order is not ready for delivery (current status: ${delivery.order.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId,
          status: DeliveryStatus.ASSIGNED,
        },
        include: {
          order: {
            include: {
              store: true,
              address: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: OrderStatus.OUT_FOR_DELIVERY,
          statusHistory: {
            create: {
              status: OrderStatus.OUT_FOR_DELIVERY,
              changedByUserId: driverId,
              notes: 'Driver assigned and accepted delivery',
            },
          },
        },
      });

      return updatedDelivery;
    });
  }

  /**
   * Driver transitions delivery status (ASSIGNED -> PICKED_UP -> DELIVERED).
   */
  async updateDeliveryStatus(
    driverId: string,
    deliveryId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.driverId !== driverId) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    const allowed = DRIVER_TRANSITIONS[delivery.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition delivery from "${delivery.status}" to "${dto.status}". Allowed transitions: [${allowed.join(', ') || 'none'}]`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = { status: dto.status };
      if (dto.status === DeliveryStatus.PICKED_UP) {
        dataToUpdate.pickedUpAt = new Date();
      } else if (dto.status === DeliveryStatus.DELIVERED) {
        dataToUpdate.deliveredAt = new Date();
      }

      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: dataToUpdate,
        include: {
          order: {
            include: {
              customer: { select: { id: true, name: true, phone: true } },
              address: true,
              store: true,
            },
          },
        },
      });

      if (dto.status === DeliveryStatus.PICKED_UP) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: delivery.orderId,
            status: OrderStatus.OUT_FOR_DELIVERY,
            changedByUserId: driverId,
            notes: dto.notes ?? 'Driver picked up items from store',
          },
        });
      } else if (dto.status === DeliveryStatus.DELIVERED) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: {
            status: OrderStatus.DELIVERED,
            paymentStatus:
              delivery.order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                ? PaymentStatus.PAID
                : delivery.order.paymentStatus,
            statusHistory: {
              create: {
                status: OrderStatus.DELIVERED,
                changedByUserId: driverId,
                notes: dto.notes ?? 'Order successfully delivered to customer',
              },
            },
          },
        });
      }

      return updatedDelivery;
    });
  }
}
