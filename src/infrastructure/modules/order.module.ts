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
    ProductRepository,
    {
      provide: IProductRepository,
      useClass: ProductRepository,
    },
    ProductOptionRepository,
    {
      provide: IProductOptionRepository,
      useClass: ProductOptionRepository,
    },
    UserRepository,
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    UserBalanceChangeLogRepository,
    {
      provide: IUserBalanceChangeLogRepository,
      useClass: UserBalanceChangeLogRepository,
    },
    CouponRepository,
    {
      provide: ICouponRepository,
      useClass: CouponRepository,
    },
    UserCouponRepository,
    {
      provide: IUserCouponRepository,
      useClass: UserCouponRepository,
    },
    OrderService,
  ],
  exports: [
    OrderService,
    OrderRepository,
    OrderItemRepository,
    IOrderRepository,
    IOrderItemRepository,
  ],
})
export class OrderModule {}
