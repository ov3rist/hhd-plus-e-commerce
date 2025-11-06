import { Injectable } from '@nestjs/common';
import { IProductRepository, IProductOptionRepository } from './interfaces';
import {
  GetProductsResponseDto,
  GetProductDetailResponseDto,
  ProductDto,
  ProductOptionDto,
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
}
