import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Get()
  @Roles(UserRole.CUSTOMER)
  async listOrders(@Request() req: any) {
    return this.ordersService.listCustomerOrders(req.user.id);
  }

  @Get(':id')
  async getOrder(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, req.user.id, req.user.role);
  }

  @Post(':id/cancel')
  @Roles(UserRole.CUSTOMER)
  async cancelOrder(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }
}
