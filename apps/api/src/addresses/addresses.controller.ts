import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  async getAddresses(@Request() req: any) {
    return this.addressesService.listUserAddresses(req.user.id);
  }

  @Post()
  async createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(req.user.id, dto);
  }
}
