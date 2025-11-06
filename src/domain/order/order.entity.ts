import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';
import { Coupon } from '@domain/coupon/coupon.entity';
import { OrderStatus } from './order-status';

/**
 * Order Entity
 * 주문 정보
 */
export class Order {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public couponId: number | null,
    public totalAmount: number,
    public discountAmount: number,
    public finalAmount: number,
    public status: OrderStatus,
    public readonly createdAt: Date,
    public paidAt: Date | null,
    public readonly expiredAt: Date,
    public updatedAt: Date,
  ) {
    this.validateAmounts();
    this.validateExpiredAt();
  }

  /**
   * 금액 검증
   */
  private validateAmounts(): void {
    if (this.totalAmount < 0) {
      throw new ValidationException('총 금액은 0 이상이어야 합니다');
    }
    if (this.discountAmount < 0) {
      throw new ValidationException('할인 금액은 0 이상이어야 합니다');
    }
    if (this.finalAmount < 0) {
      throw new ValidationException('최종 금액은 0 이상이어야 합니다');
    }
    // BR-013: 최종 결제 금액은 (상품 총액 - 쿠폰 할인) 이다
    if (this.totalAmount - this.discountAmount !== this.finalAmount) {
      throw new ValidationException('최종 금액이 올바르지 않습니다');
    }
  }

  /**
   * 만료 시간 검증
   */
  private validateExpiredAt(): void {
    if (this.expiredAt <= this.createdAt) {
      throw new ValidationException(
        '만료 시간은 생성 시간보다 이후여야 합니다',
      );
    }
  }

  /**
   * 주문 생성 (정적 팩토리 메서드)
   * BR-005: 재고 선점은 최대 10분간 유지되며, 이후 자동 해제된다
   */
  static create(
    id: number,
    userId: number,
    totalAmount: number,
    discountAmount: number = 0,
    couponId: number | null = null,
  ): Order {
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 10 * 60 * 1000); // 10분 후

    return new Order(
      id,
      userId,
      couponId,
      totalAmount,
      discountAmount,
      totalAmount - discountAmount,
      OrderStatus.PENDING,
      now,
      null,
      expiredAt,
      now,
    );
  }

  /**
   * 쿠폰과 함께 주문 생성 (정적 팩토리 메서드)
   * BR-009: 한 번의 주문에 하나의 쿠폰만 사용 가능하다
   * BR-010: 쿠폰 할인은 상품 금액의 일정 비율(%)로 적용된다
   * BR-012: 쿠폰 할인은 결제 금액에서 차감된다
   */
  static createWithCoupon(
    id: number,
    userId: number,
    totalAmount: number,
    coupon: Coupon,
  ): Order {
    if (!coupon.canIssue()) {
      throw new DomainException(ErrorCode.EXPIRED_COUPON);
    }

    const discountAmount = coupon.calculateDiscount(totalAmount);
    return Order.create(id, userId, totalAmount, discountAmount, coupon.id);
  }

  /**
   * 주문 만료 여부 확인
   * BR-005: 재고 선점은 최대 10분간 유지되며, 이후 자동 해제된다
   * RF-012: 시스템은 결제 창 진입 후 일정 시간(10분) 내 미결제 시 선점 재고를 자동 해제해야 한다
   */
  isExpired(): boolean {
    return new Date() > this.expiredAt;
  }

  /**
   * 결제 가능 여부 확인
   */
  canPay(): boolean {
    // PENDING 상태여야 함
    if (!this.status.isPending()) {
      return false;
    }

    // 만료되지 않아야 함
    if (this.isExpired()) {
      return false;
    }

    return true;
  }

  /**
   * 결제 처리
   * BR-014: 주문 상태는 PENDING(대기) → PAID(결제완료) → CANCELLED(취소) 로 변경된다
   * RF-010: 사용자는 주문에 대한 결제를 진행할 수 있어야 한다
   */
  pay(): void {
    if (!this.canPay()) {
      if (this.status.isPaid()) {
        throw new DomainException(ErrorCode.ALREADY_PAID);
      }
      if (this.isExpired()) {
        throw new DomainException(ErrorCode.ORDER_EXPIRED);
      }
      throw new DomainException(ErrorCode.PAYMENT_FAILED);
    }

    this.status = OrderStatus.PAID;
    this.paidAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 주문 취소
   * BR-014: 주문 상태는 PENDING(대기) → PAID(결제완료) → CANCELLED(취소) 로 변경된다
   * RF-011: 시스템은 결제 실패 시 선점한 재고를 복원해야 한다
   */
  cancel(): void {
    if (!this.status.isPending()) {
      throw new ValidationException('대기 중인 주문만 취소할 수 있습니다');
    }

    this.status = OrderStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  /**
   * 주문 만료 처리 (10분 초과 시 자동 호출)
   * BR-005: 재고 선점은 최대 10분간 유지되며, 이후 자동 해제된다
   * RF-012: 시스템은 결제 창 진입 후 일정 시간(10분) 내 미결제 시 선점 재고를 자동 해제해야 한다
   */
  expire(): void {
    if (!this.status.isPending()) {
      throw new ValidationException('대기 중인 주문만 만료시킬 수 있습니다');
    }

    if (!this.isExpired()) {
      throw new ValidationException('만료 시간이 지나지 않았습니다');
    }

    this.status = OrderStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  /**
   * 쿠폰 적용 여부 확인
   */
  hasCoupon(): boolean {
    return this.couponId !== null;
  }

  /**
   * 사용자 소유 여부 확인
   */
  isOwnedBy(userId: number): boolean {
    return this.userId === userId;
  }
}
