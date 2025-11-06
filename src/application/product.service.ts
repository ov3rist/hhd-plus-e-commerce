import { Injectable } from '@nestjs/common';
import { IProductRepository, IProductOptionRepository } from './interfaces';
import {
  GetProductsResponseDto,
  GetProductDetailResponseDto,
  GetTopProductsResponseDto,
  ProductDto,
  ProductOptionDto,
  TopProductDto,
} from '@presentation/product/dto';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

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

  /**
   * 상품 상세 조회 (US-002)
   * 특정 상품의 상세 정보와 옵션을 조회
   */
  async getProductDetail(
    productId: number,
  ): Promise<GetProductDetailResponseDto> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new DomainException(ErrorCode.PRODUCT_NOT_FOUND);
    }

    const options =
      await this.productOptionRepository.findByProductId(productId);

    const optionDtos: ProductOptionDto[] = options.map((option) => ({
      productOptionId: option.id,
      color: option.color,
      size: option.size,
      stock: option.availableStock,
    }));

    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      isAvailable: product.isAvailable,
      options: optionDtos,
    };
  }

  /**
   * 상위 상품 조회 (US-003)
   * 최근 3일간 가장 많이 팔린 상위 5개 상품 목록 조회
   * TODO: 구현 필요
   */
  async getTopProducts(): Promise<GetTopProductsResponseDto> {
    // TODO: ProductPopularitySnapshot 엔티티를 활용하여
    // 최근 3일간의 스냅샷 데이터에서 판매량 기준 상위 5개 상품을 조회
    // 1. 최근 3일간의 스냅샷 데이터 조회
    // 2. 상품별 판매량 집계
    // 3. 판매량 기준 내림차순 정렬
    // 4. 상위 5개 상품 반환
    // 5. TopProductDto[] 형식으로 매핑
    // 6. GetTopProductsResponseDto 반환 (products, createdAt)
    throw new Error('Not implemented');
  }
}
