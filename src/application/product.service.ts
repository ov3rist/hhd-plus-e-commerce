import { Injectable } from '@nestjs/common';
import { IProductRepository, IProductOptionRepository } from './interfaces';
import { GetProductsResponseDto, ProductDto } from '@presentation/product/dto';

/**
 * Product Service
 * 상품 조회 유스케이스
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
  ) {}

  /**
   * 상품 목록 조회 (US-001)
   * 판매 중인 상품 목록을 조회
   */
  async getProducts(): Promise<GetProductsResponseDto> {
    const products = await this.productRepository.findAll();
    const availableProducts = products.filter((product) => product.isAvailable);

    const productDtos: ProductDto[] = availableProducts.map((product) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      isAvailable: product.isAvailable,
    }));

    return {
      products: productDtos,
    };
  }
}
