import { Product } from '@domain/product/product.entity';
import { ProductOption } from '@domain/product/product-option.entity';

/**
 * Product Repository Port
 * 상품 데이터 접근 계약
 */
export abstract class IProductRepository {
  abstract findById(id: number): Promise<Product | null>;
  abstract findAll(): Promise<Product[]>;
  abstract findByIds(ids: number[]): Promise<Product[]>;
  abstract save(product: Product): Promise<Product>;
}

/**
 * ProductOption Repository Port
 * 상품 옵션 데이터 접근 계약
 */
export abstract class IProductOptionRepository {
  abstract findById(id: number): Promise<ProductOption | null>;
  abstract findByProductId(productId: number): Promise<ProductOption[]>;
  abstract findByIds(ids: number[]): Promise<ProductOption[]>;
  abstract save(productOption: ProductOption): Promise<ProductOption>;
}
