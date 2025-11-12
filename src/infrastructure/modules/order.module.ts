import { Module } from '@nestjs/common';
import { OrderFacade } from '@application/facades/order.facade';
import { OrderDomainService } from '@domain/order';
import { UserDomainService } from '@domain/user';
import {
  IOrderRepository,
  IOrderItemRepository,
  IProductRepository,
  IProductOptionRepository,
  IUserRepository,
  IUserBalanceChangeLogRepository,
  ICouponRepository,
  IUserCouponRepository,
} from '@domain/interfaces';
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
    OrderDomainService,
    UserDomainService,
    OrderFacade,
  ],
  exports: [
    OrderFacade,
    OrderRepository,
    OrderItemRepository,
    IOrderRepository,
    IOrderItemRepository,
  ],
})
export class OrderModule {}
