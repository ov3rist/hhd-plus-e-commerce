import { Module } from '@nestjs/common';
import { CartFacade } from '@application/facades/cart.facade';
import { CartDomainService } from '@domain/cart';
import { ProductDomainService } from '@domain/product';
import { ProductModule } from './product.module';
import { ICartRepository } from '@domain/interfaces';
import { CartRepository } from '@infrastructure/repositories/prisma';
import { CartController } from '@presentation/cart';

/**
 * Cart Module
 * 장바구니 관리 모듈
 */
@Module({
  imports: [ProductModule],
  controllers: [CartController],
  providers: [
    // Cart Repository (자신의 도메인만)
    CartRepository,
    {
      provide: ICartRepository,
      useClass: CartRepository,
    },

    // Domain Service
    CartDomainService,

    // Facade
    CartFacade,
  ],
  exports: [CartDomainService, ICartRepository],
})
export class CartModule {}
