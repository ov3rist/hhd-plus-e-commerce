import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

/**
 * OrderItem Entity
 * 주문 상품 상세
 */
export class OrderItem {
  constructor(
    public readonly id: number,
    public readonly orderId: number,
    public readonly productOptionId: number,
    public readonly productName: string,
    public readonly price: number,
    public readonly quantity: number,
    public readonly subtotal: number,
    public readonly createdAt: Date,
  ) {
    this.validatePrice();
    this.validateQuantity();
    this.validateSubtotal();
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
   * 수량 검증
   */
  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
      throw new DomainException(ErrorCode.INVALID_QUANTITY);
    }
  }

  /**
   * 소계 검증
   */
  private validateSubtotal(): void {
    if (this.subtotal < 0) {
      throw new ValidationException('소계는 0 이상이어야 합니다');
    }

    // 소계 = 가격 × 수량
    if (this.price * this.quantity !== this.subtotal) {
      throw new ValidationException('소계가 올바르지 않습니다');
    }
  }

  // /**
  //  * OrderItem 생성 (정적 팩토리 메서드)
  //  * 주문 당시의 가격을 스냅샷으로 저장
  //  */
  // static create(
  //   id: number,
  //   orderId: number,
  //   productOptionId: number,
  //   productName: string,
  //   price: number,
  //   quantity: number,
  // ): OrderItem {
  //   const subtotal = price * quantity;

  //   return new OrderItem(
  //     id,
  //     orderId,
  //     productOptionId,
  //     productName,
  //     price,
  //     quantity,
  //     subtotal,
  //     new Date(),
  //   );
  // }
}
