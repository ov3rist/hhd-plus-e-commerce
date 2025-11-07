import { Module } from '@nestjs/common';
import { CartService } from '@application/cart.service';
import {
  ICartRepository,
  IProductRepository,
  IProductOptionRepository,
} from '@application/interfaces';
import {
  CartRepository,
  ProductRepository,
  ProductOptionRepository,
} from '@infrastructure/repositories';
import { CartController } from '@presentation/cart';

/**
 * Cart Module
 * 장바구니 관리 모듈
 */
@Module({
  controllers: [CartController],
  providers: [
    {
      provide: ICartRepository,
      useClass: CartRepository,
    },
    {
      provide: IProductRepository,
      useClass: ProductRepository,
    },
    {
      provide: IProductOptionRepository,
      useClass: ProductOptionRepository,
    },
    CartService,
  ],
  exports: [CartService],
})
export class CartModule {}
