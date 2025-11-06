import { Module } from '@nestjs/common';
import { OrderService } from '@application/order.service';
import {
  IOrderRepository,
  IOrderItemRepository,
  IProductRepository,
  IProductOptionRepository,
  IUserRepository,
  IUserBalanceChangeLogRepository,
  ICouponRepository,
  IUserCouponRepository,
} from '@application/interfaces';
import {
  OrderRepository,
  OrderItemRepository,
  ProductRepository,
  ProductOptionRepository,
  UserRepository,
  UserBalanceChangeLogRepository,
  CouponRepository,
  UserCouponRepository,
} from '@infrastructure/repositories';
import { OrderController } from '@presentation/order';

/**
 * Order Module
 * 주문 및 결제 관리 모듈
 */
@Module({
  controllers: [OrderController],
  providers: [
    {
      provide: IOrderRepository,
      useClass: OrderRepository,
    },
    {
      provide: IOrderItemRepository,
      useClass: OrderItemRepository,
    },
    {
      provide: IProductRepository,
      useClass: ProductRepository,
    },
    {
      provide: IProductOptionRepository,
      useClass: ProductOptionRepository,
    },
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: IUserBalanceChangeLogRepository,
      useClass: UserBalanceChangeLogRepository,
    },
    {
      provide: ICouponRepository,
      useClass: CouponRepository,
    },
    {
      provide: IUserCouponRepository,
      useClass: UserCouponRepository,
    },
    OrderService,
  ],
  exports: [OrderService],
})
export class OrderModule {}
