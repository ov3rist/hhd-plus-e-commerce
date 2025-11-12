import { Injectable } from '@nestjs/common';
import {
  IProductOptionRepository,
  IProductRepository,
} from '@domain/interfaces';
import { Product } from './product.entity';
import { ProductOption } from './product-option.entity';
import { ProductPopularitySnapshot } from './product-popularity-snapshot.entity';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

export interface ProductDetailSnapshot {
  product: Product;
  options: ProductOption[];
}

/**
 * ProductDomainService
 * 상품 조회 도메인 규칙 담당.
 */
@Injectable()
export class ProductDomainService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
  ) {}

  /**
   * 판매 가능 상품 목록 조회
   */
  async fetchAvailableProducts(): Promise<Product[]> {
    const products = await this.productRepository.findAll();
    return products.filter((product) => product.isAvailable);
  }

  /**
   * 상품 상세 및 옵션 조회
   */
  async fetchProductDetail(productId: number): Promise<ProductDetailSnapshot> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new DomainException(ErrorCode.PRODUCT_NOT_FOUND);
    }

    const options =
      await this.productOptionRepository.findByProductId(productId);

    return { product, options };
  }

  /**
   * 인기 상품 스냅샷 조회
   */
  async fetchTopProducts(): Promise<ProductPopularitySnapshot[]> {
    return this.productRepository.findTopProducts();
  }
}
