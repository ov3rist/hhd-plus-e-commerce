import { Module } from '@nestjs/common';
import { ProductFacade } from '@application/facades/product.facade';
import { ProductDomainService } from '@domain/product';
import {
  IProductRepository,
  IProductOptionRepository,
  IProductPopularitySnapshotRepository,
} from '@domain/interfaces';
import {
  ProductRepository,
  ProductOptionRepository,
  ProductPopularitySnapshotRepository,
} from '@infrastructure/repositories';
import { ProductController } from '@presentation/product';

/**
 * Product Module
 * 상품 관련 기능 모듈
 */
@Module({
  controllers: [ProductController],
  providers: [
    // Product Repositories
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
    ProductPopularitySnapshotRepository,
    {
      provide: IProductPopularitySnapshotRepository,
      useClass: ProductPopularitySnapshotRepository,
    },

    // Domain Service
    ProductDomainService,

    // Facade
    ProductFacade,
  ],
  exports: [
    ProductDomainService,
    IProductRepository,
    IProductOptionRepository,
    IProductPopularitySnapshotRepository,
  ],
})
export class ProductModule {}
