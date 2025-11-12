import { Module } from '@nestjs/common';
import { ProductFacade } from '@application/facades/product.facade';
import { ProductDomainService } from '@domain/product';
import {
  IProductRepository,
  IProductOptionRepository,
} from '@domain/interfaces';
import {
  ProductRepository,
  ProductOptionRepository,
} from '@infrastructure/repositories';
import { ProductController } from '@presentation/product';

/**
 * Product Module
 * 상품 관련 기능 모듈
 */
@Module({
  controllers: [ProductController],
  providers: [
    ProductRepository,
    ProductOptionRepository,
    {
      provide: IProductRepository,
      useClass: ProductRepository,
    },
    {
      provide: IProductOptionRepository,
      useClass: ProductOptionRepository,
    },
    ProductDomainService,
    ProductFacade,
  ],
  exports: [ProductFacade, IProductRepository, IProductOptionRepository],
})
export class ProductModule {}
