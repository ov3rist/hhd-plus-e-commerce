import { Module } from '@nestjs/common';
import { OrderFacade } from '@application/facades/order.facade';
import { OrderDomainService } from '@domain/order';
import { ProductDomainService } from '@domain/product';
import { UserDomainService } from '@domain/user';
import { CouponDomainService } from '@domain/coupon';
import { ProductModule } from './product.module';
import { UserModule } from './user.module';
import { CouponModule } from './coupon.module';
import { IOrderRepository, IOrderItemRepository } from '@domain/interfaces';
import {
  OrderRepository,
  OrderItemRepository,
} from '@infrastructure/repositories';
import { OrderController } from '@presentation/order';

/**
 * Order Module
 * 주문 및 결제 관리 모듈
 */
@Module({
  imports: [ProductModule, UserModule, CouponModule],
  controllers: [OrderController],
  providers: [
    // Order Repositories (자신의 도메인만)
    OrderRepository,
    {
      provide: IOrderRepository,
      useClass: OrderRepository,
    },
    OrderItemRepository,
    {
      provide: IOrderItemRepository,
      useClass: OrderItemRepository,
    },

    // Domain Service
    OrderDomainService,

    // Facade
    OrderFacade,
  ],
  exports: [OrderDomainService, IOrderRepository, IOrderItemRepository],
})
export class OrderModule {}
