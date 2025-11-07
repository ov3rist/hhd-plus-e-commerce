import { Module } from '@nestjs/common';
import {
  ProductModule,
  UserModule,
  CartModule,
  OrderModule,
  CouponModule,
  SchedulerModule,
} from '@infrastructure/modules';

@Module({
  imports: [
    ProductModule,
    UserModule,
    CartModule,
    OrderModule,
    CouponModule,
    SchedulerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
