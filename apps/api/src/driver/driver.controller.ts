import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Controller('driver/deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('available')
  getAvailableDeliveries() {
    return this.driverService.getAvailableDeliveries();
  }

  @Get('active')
  getActiveDelivery(@Request() req: any) {
    return this.driverService.getActiveDelivery(req.user.id);
  }

  @Get('history')
  getDeliveryHistory(@Request() req: any) {
    return this.driverService.getDeliveryHistory(req.user.id);
  }

  @Post(':id/accept')
  acceptDelivery(@Request() req: any, @Param('id') id: string) {
    return this.driverService.acceptDelivery(req.user.id, id);
  }

  @Patch(':id/status')
  updateDeliveryStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.driverService.updateDeliveryStatus(req.user.id, id, dto);
  }
}
