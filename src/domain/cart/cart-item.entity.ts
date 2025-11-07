import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

/**
 * CartItem Entity
 * 장바구니 항목
 */
export class CartItem {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly productOptionId: number,
    public quantity: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validateQuantity();
  }

  /**
   * 수량 검증
   */
  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
      throw new ValidationException('수량은 1 이상의 정수여야 합니다');
    }
  }

  /**
   * 수량 변경
   * RF-005: 사용자는 장바구니에 상품을 추가할 수 있어야 한다
   */
  updateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainException(ErrorCode.INVALID_QUANTITY);
    }

    this.quantity = quantity;
    this.updatedAt = new Date();
  }
}
