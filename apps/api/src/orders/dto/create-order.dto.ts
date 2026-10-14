import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubstitutionPreference } from '@prisma/client';

export class OrderItemInputDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsInt()
  @IsPositive({ message: 'Quantity must be greater than zero' })
  quantity: number; // units for EACH, grams for WEIGHT
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  storeId: string;

  @IsNotEmpty()
  @IsString()
  addressId: string;

  @IsNotEmpty()
  @IsString()
  deliverySlotId: string;

  @IsEnum(SubstitutionPreference, {
    message: 'Substitution preference must be ALLOW_SUBSTITUTES, REFUND_ITEM, or CONTACT_ME',
  })
  substitutionPreference: SubstitutionPreference;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}
