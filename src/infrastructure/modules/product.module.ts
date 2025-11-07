import { Module } from '@nestjs/common';
import { ProductService } from '@application/product.service';
import {
  IProductRepository,
  IProductOptionRepository,
} from '@application/interfaces';
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
    {
      provide: IProductRepository,
      useClass: ProductRepository,
    },
    {
      provide: IProductOptionRepository,
      useClass: ProductOptionRepository,
    },
    ProductService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
