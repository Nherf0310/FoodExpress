import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StoresModule } from './stores/stores.module';
import { AddressesModule } from './addresses/addresses.module';
import { OrdersModule } from './orders/orders.module';
import { StoreManagementModule } from './store/store-management.module';
import { DriverModule } from './driver/driver.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    AddressesModule,
    OrdersModule,
    StoreManagementModule,
    DriverModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
