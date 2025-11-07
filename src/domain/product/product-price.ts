import { ValidationException } from '@domain/common/exceptions';

/**
 * ProductPrice Value Object
 * 가격 계산 로직을 캡슐화
 */
export class ProductPrice {
  private constructor(private readonly value: number) {
    if (value < 0) {
      throw new ValidationException('가격은 0 이상이어야 합니다');
    }
  }

  static of(value: number): ProductPrice {
    return new ProductPrice(value);
  }

  getValue(): number {
    return this.value;
  }

  /**
   * 할인 금액 계산
   * BR-010: 할인 금액은 소수점 첫 번째 자리에서 버림
   */
  calculateDiscount(discountRate: number): number {
    if (discountRate < 0 || discountRate > 100) {
      throw new ValidationException('할인율은 0~100 사이여야 합니다');
    }
    return Math.floor(this.value * (discountRate / 100));
  }

  /**
   * 할인 후 최종 가격
   */
  applyDiscount(discountRate: number): number {
    return this.value - this.calculateDiscount(discountRate);
  }
}
