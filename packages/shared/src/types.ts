import {
  UserRole,
  UnitType,
  OrderStatus,
  DeliveryStatus,
  SubstitutionPreference,
  PaymentMethod,
  PaymentStatus,
} from './enums';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}

export interface AddressDto {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export interface StoreDto {
  id: string;
  managerId: string;
  name: string;
  description?: string | null;
  address: string;
  phone?: string | null;
  imageUrl?: string | null;
  isOpen: boolean;
  isApproved: boolean;
  minOrderAmount: number; // in cents
  deliveryFee: number; // in cents
}

export interface CategoryDto {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
}

export interface ProductDto {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  price: number; // in cents
  unitType: UnitType; // EACH or WEIGHT
  unitLabel: string; // e.g. "kg", "pack", "bunch"
  isAvailable: boolean;
  inventory?: InventoryDto | null;
  category?: CategoryDto | null;
}

export interface InventoryDto {
  id: string;
  productId: string;
  quantityInStock: number; // units for EACH, grams for WEIGHT
  lowStockThreshold: number;
}

export interface DeliverySlotDto {
  id: string;
  storeId: string;
  date: string | Date;
  startTime: string; // e.g. "10:00"
  endTime: string; // e.g. "12:00"
  capacity: number;
  bookedCount: number;
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number; // in cents snapshot
  unitType: UnitType;
  unitLabel: string;
  quantityOrdered: number; // units or grams
  quantityFulfilled: number;
  substitutedProductId?: string | null;
  lineTotal: number; // in cents
  product?: ProductDto | null;
  substitutedProduct?: ProductDto | null;
}

export interface OrderStatusHistoryDto {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedByUserId?: string | null;
  notes?: string | null;
  createdAt: string | Date;
}

export interface DeliveryDto {
  id: string;
  orderId: string;
  driverId?: string | null;
  status: DeliveryStatus;
  pickedUpAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  driver?: UserDto | null;
}

export interface OrderDto {
  id: string;
  customerId: string;
  storeId: string;
  addressId: string;
  deliverySlotId: string;
  status: OrderStatus;
  substitutionPreference: SubstitutionPreference;
  customerNotes?: string | null;
  itemSubtotal: number; // in cents
  deliveryFee: number; // in cents
  total: number; // in cents
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer?: UserDto;
  store?: StoreDto;
  address?: AddressDto;
  deliverySlot?: DeliverySlotDto;
  items?: OrderItemDto[];
  delivery?: DeliveryDto | null;
  statusHistory?: OrderStatusHistoryDto[];
}

// Request DTOs
export interface CreateOrderCartItemDto {
  productId: string;
  quantity: number; // count for EACH, grams for WEIGHT
}

export interface CreateOrderDto {
  storeId: string;
  addressId: string;
  deliverySlotId: string;
  substitutionPreference: SubstitutionPreference;
  customerNotes?: string;
  items: CreateOrderCartItemDto[];
}

export interface UpdateOrderItemFulfillmentDto {
  quantityFulfilled: number;
  substitutedProductId?: string;
}
