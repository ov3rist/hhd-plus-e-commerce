import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  ProductModule,
  UserModule,
  CartModule,
  OrderModule,
  CouponModule,
} from '@infrastructure/modules';

@Module({
  imports: [ProductModule, UserModule, CartModule, OrderModule, CouponModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
