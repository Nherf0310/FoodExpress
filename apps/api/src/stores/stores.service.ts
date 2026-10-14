import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async listApprovedStores(openOnly?: boolean) {
    const where: any = { isApproved: true };
    if (openOnly) {
      where.isOpen = true;
    }

    return this.prisma.store.findMany({
      where,
      include: {
        _count: {
          select: {
            categories: true,
            products: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStoreById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${id}" not found`);
    }

    return store;
  }

  async getCategories(storeId: string) {
    return this.prisma.category.findMany({
      where: { storeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getProducts(
    storeId: string,
    filters?: {
      categoryId?: string;
      search?: string;
      inStockOnly?: boolean;
    },
  ) {
    const where: any = {
      storeId,
      isAvailable: true,
    };

    if (filters?.categoryId && filters.categoryId !== 'All') {
      where.categoryId = filters.categoryId;
    }

    if (filters?.search && filters.search.trim() !== '') {
      where.name = {
        contains: filters.search.trim(),
        mode: 'insensitive',
      };
    }

    if (filters?.inStockOnly) {
      where.inventory = {
        quantityInStock: {
          gt: 0,
        },
      };
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
        store: {
          select: {
            id: true,
            name: true,
            deliveryFee: true,
            minOrderAmount: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async getDeliverySlots(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.deliverySlot.findMany({
      where: {
        storeId,
        date: {
          gte: today,
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }
}
