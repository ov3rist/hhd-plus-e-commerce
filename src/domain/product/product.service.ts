import { Injectable } from '@nestjs/common';
import {
  IProductOptionRepository,
  IProductPopularitySnapshotRepository,
  IProductRepository,
} from '@domain/interfaces';
import { Product } from './product.entity';
import { ProductOption } from './product-option.entity';
import { ProductPopularitySnapshot } from './product-popularity-snapshot.entity';
import { ValidationException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';
import { OrderItemData } from '@domain/order';

/**
 * ProductDomainService
 * 상품 관련 영속성 계층과 상호작용하며 핵심 비즈니스 로직을 담당한다.
 */
@Injectable()
export class ProductDomainService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
    private readonly productPopularitySnapshotRepository: IProductPopularitySnapshotRepository,
  ) {}

  /**
   * ANCHOR 판매 가능 상품 목록 조회
   */
  async getProductsOnSale(): Promise<Product[]> {
    const products = await this.productRepository.findAll();
    return products.filter((product) => product.isAvailable);
  }

  /**
   * ANCHOR 상품 단건 조회
   */
  async getProduct(productId: number): Promise<Product> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ValidationException(ErrorCode.PRODUCT_NOT_FOUND);
    }
    return product;
  }

  /**
   * ANCHOR 상품 상세 및 옵션 조회 (재고 포함)
   */
  async getProductOptions(productId: number): Promise<ProductOption[]> {
    const options =
      await this.productOptionRepository.findManyByProductId(productId);

    return options;
  }

  /**
   * ANCHOR 상품 옵션 단건 조회
   */
  async getProductOption(productOptionId: number): Promise<ProductOption> {
    const option = await this.productOptionRepository.findById(productOptionId);
    if (!option) {
      throw new ValidationException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }
    return option;
  }

  /**
   * ANCHOR 인기 상품 스냅샷 조회
   */
  async getTopProducts(count: number): Promise<ProductPopularitySnapshot[]> {
    if (count <= 0) {
      throw new ValidationException(ErrorCode.INVALID_ARGUMENT);
    }

    return this.productPopularitySnapshotRepository.findTop(count);
  }

  /**
   * ANCHOR 상품 재고 관리자 업데이트
   * 상품 재고 수량을 증가시키거나 선점중인 재고수량 까지 차감시킬 수 있다.
   */
  async updateProductOptionStock(
    productOptionId: number,
    operation: 'increase' | 'decrease',
    quantity: number,
  ): Promise<void> {
    const option = await this.productOptionRepository.findById(productOptionId);
    if (!option) {
      throw new ValidationException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }

    if (operation === 'decrease') {
      if (option.stock < quantity) {
        throw new ValidationException(ErrorCode.INSUFFICIENT_STOCK);
      }
      option.adjustStock(option.stock - quantity);
    } else if (operation === 'increase') {
      option.adjustStock(option.stock + quantity);
    } else {
      throw new ValidationException(ErrorCode.INVALID_ARGUMENT);
    }

    await this.productOptionRepository.update(option); // save
  }

  /**
   * ANCHOR 주문용 상품 정보 조회 및 재고 선점
   */
  async reserveProductsForOrder(
    items: Array<{ productOptionId: number; quantity: number }>,
  ): Promise<OrderItemData[]> {
    const orderItemsData: OrderItemData[] = [];

    for (const item of items) {
      const productOption = await this.getProductOption(item.productOptionId);
      const product = await this.getProduct(productOption.productId);

      productOption.reserveStock(item.quantity);
      await this.productOptionRepository.update(productOption);

      orderItemsData.push({
        productName: product.name,
        price: product.price,
        productOptionId: productOption.id,
        quantity: item.quantity,
      });
    }

    return orderItemsData;
  }

  /**
   * ANCHOR 결제 완료 시 재고 확정 차감
   */
  async confirmPaymentStock(
    productOptionId: number,
    quantity: number,
  ): Promise<void> {
    const option = await this.productOptionRepository.findById(productOptionId);
    if (!option) {
      throw new ValidationException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }

    option.decreaseStock(quantity);
    await this.productOptionRepository.update(option);
  }
}
