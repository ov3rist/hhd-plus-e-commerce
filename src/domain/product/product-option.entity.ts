import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

/**
 * ProductOption Entity
 */
export class ProductOption {
  constructor(
    public readonly id: number,
    public readonly productId: number,
    public color: string | null,
    public size: string | null,
    public stock: number,
    public reservedStock: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validateStock();
  }

  private validateStock(): void {
    if (this.stock < 0 || this.reservedStock < 0) {
      throw new ValidationException('재고는 0 이상이어야 합니다');
    }
    if (this.reservedStock > this.stock) {
      throw new ValidationException(
        '선점 재고는 전체 재고를 초과할 수 없습니다',
      );
    }
  }

  get availableStock(): number {
    return this.stock - this.reservedStock;
  }

  /**
   * 재고 선점 (주문서 생성 시)
   * BR-002: 주문 가능 수량은 (현재 재고 - 선점된 재고) 기준
   */
  reserveStock(quantity: number): void {
    if (quantity <= 0) {
      throw new DomainException(ErrorCode.INVALID_STOCK_QUANTITY);
    }
    if (this.availableStock < quantity) {
      throw new DomainException(ErrorCode.INSUFFICIENT_STOCK);
    }
    this.reservedStock += quantity;
  }

  /**
   * 재고 확정 차감 (결제 완료 시)
   * BR-003: 결제 완료 시점에 재고가 확정 차감
   */
  decreaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new DomainException(ErrorCode.INVALID_STOCK_QUANTITY);
    }
    if (this.reservedStock < quantity) {
      throw new ValidationException('선점된 재고가 부족합니다');
    }
    this.stock -= quantity;
    this.reservedStock -= quantity;
  }

  /**
   * 선점 재고 해제 (결제 실패/만료 시)
   * BR-004: 결제 실패 또는 주문 취소 시 선점된 재고는 즉시 해제
   */
  releaseReservedStock(quantity: number): void {
    if (quantity <= 0) {
      throw new DomainException(ErrorCode.INVALID_STOCK_QUANTITY);
    }
    if (this.reservedStock < quantity) {
      throw new ValidationException('해제할 선점 재고가 부족합니다');
    }
    this.reservedStock -= quantity;
  }

  /**
   * BR-001: 재고가 0 이하인 상품은 주문할 수 없다
   */
  canBeOrdered(): boolean {
    return this.availableStock > 0;
  }
}
