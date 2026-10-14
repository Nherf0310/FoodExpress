import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number; // in cents

  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number; // in cents
}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateProductDto {
  @IsString()
  categoryId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  @IsPositive()
  price: number; // in cents

  @IsString()
  unitType: string; // EACH or WEIGHT

  @IsString()
  unitLabel: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  brand?: string;
}

export class AdjustInventoryDto {
  @IsInt()
  quantityInStock: number; // absolute new value, units or grams

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class CreateDeliverySlotDto {
  @IsString()
  date: string; // ISO date string YYYY-MM-DD

  @IsString()
  startTime: string; // HH:mm

  @IsString()
  endTime: string; // HH:mm

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;
}

export class UpdateOrderStatusDto {
  @IsString()
  status: string; // CONFIRMED | PICKING | READY_FOR_DELIVERY | CANCELLED

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FulfillOrderItemDto {
  @IsInt()
  @Min(0)
  quantityFulfilled: number; // actual picked units or grams

  @IsOptional()
  @IsString()
  substitutedProductId?: string;
}
