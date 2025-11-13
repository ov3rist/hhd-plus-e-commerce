import { ValidationException } from '@domain/common/exceptions';

/**
 * Product Entity
 */
export class Product {
  constructor(
    public readonly id: number,
    public name: string,
    public description: string,
    public price: number,
    public category: string,
    public isAvailable: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validatePrice();
  }

  /**
   * 가격 검증
   */
  private validatePrice(): void {
    if (this.price < 0) {
      throw new ValidationException('가격은 0 이상이어야 합니다');
    }
  }

  /**
   * 판매 가능 여부 확인
   * 상품이 판매 가능 상태인지 확인 (재고와 별개)
   */
  canBeSold(): boolean {
    return this.isAvailable;
  }

  /**
   * 상품 판매 중지
   */
  markAsUnavailable(): void {
    this.isAvailable = false;
    this.updatedAt = new Date();
  }

  /**
   * 상품 판매 재개
   */
  markAsAvailable(): void {
    this.isAvailable = true;
    this.updatedAt = new Date();
  }

  // static create(
  //   name: string,
  //   description: string,
  //   price: number,
  //   category: string,
  //   isAvailable: boolean,
  // ): Product {
  //   const now = new Date();
  //   return new Product(
  //     0,
  //     name,
  //     description,
  //     price,
  //     category,
  //     isAvailable,
  //     now,
  //     now,
  //   );
  // }
}
