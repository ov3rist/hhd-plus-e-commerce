import { Module } from '@nestjs/common';
import { CartFacade } from '@application/facades/cart.facade';
import { CartDomainService } from '@domain/cart';
import {
  ICartRepository,
  IProductRepository,
  IProductOptionRepository,
} from '@domain/interfaces';
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
    CartRepository,
    ProductRepository,
    ProductOptionRepository,
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
    CartDomainService,
    CartFacade,
  ],
  exports: [CartFacade],
})
export class CartModule {}
