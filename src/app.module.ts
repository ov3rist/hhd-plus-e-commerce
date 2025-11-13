import { Module } from '@nestjs/common';
import {
  ProductModule,
  UserModule,
  CartModule,
  OrderModule,
  CouponModule,
  SchedulerModule,
} from '@infrastructure/modules';
import { GlobalPrismaModule } from '@infrastructure/prisma/prisma.module';

@Module({
  imports: [
    // GLOBAL
    GlobalPrismaModule,

    // APP MODULES
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
