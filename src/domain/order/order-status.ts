import { ValidationException } from '@domain/common/exceptions';

/**
 * OrderStatus Value Object
 * BR-014: 주문 상태는 PENDING(대기) → PAID(결제완료) → CANCELLED(취소) 로 변경된다
 * EXPIRED 상태 : 10분 초과로 자동 만료된 주문
 */
export class OrderStatus {
  private static readonly VALID_STATUSES = [
    'PENDING',
    'PAID',
    'CANCELLED',
    'EXPIRED',
  ] as const;

  public static readonly PENDING = new OrderStatus('PENDING');
  public static readonly PAID = new OrderStatus('PAID');
  public static readonly CANCELLED = new OrderStatus('CANCELLED');
  public static readonly EXPIRED = new OrderStatus('EXPIRED');

  private constructor(
    public readonly value: (typeof OrderStatus.VALID_STATUSES)[number],
  ) {
    if (!OrderStatus.VALID_STATUSES.includes(value)) {
      throw new ValidationException(`유효하지 않은 주문 상태: ${value}`);
    }
  }

  static from(value: string): OrderStatus {
    const upperValue = value.toUpperCase();
    switch (upperValue) {
      case 'PENDING':
        return OrderStatus.PENDING;
      case 'PAID':
        return OrderStatus.PAID;
      case 'CANCELLED':
        return OrderStatus.CANCELLED;
      case 'EXPIRED':
        return OrderStatus.EXPIRED;
      default:
        throw new ValidationException(`유효하지 않은 주문 상태: ${value}`);
    }
  }

  isPending(): boolean {
    return this.value === 'PENDING';
  }

  isPaid(): boolean {
    return this.value === 'PAID';
  }

  isCancelled(): boolean {
    return this.value === 'CANCELLED';
  }

  isExpired(): boolean {
    return this.value === 'EXPIRED';
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
    // PENDING -> PAID, CANCELLED, EXPIRED
    if (this.isPending()) {
      return (
        newStatus.isPaid() || newStatus.isCancelled() || newStatus.isExpired()
      );
    }

    // PAID, CANCELLED, EXPIRED는 상태 변경 불가
    return false;
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
