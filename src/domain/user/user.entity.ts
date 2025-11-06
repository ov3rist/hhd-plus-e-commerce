import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';
import {
  UserBalanceChangeLog,
  BalanceChangeCode,
} from './user-balance-change-log.entity';

/**
 * User Entity
 */
export class User {
  constructor(
    public readonly id: number,
    public balance: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validateBalance();
  }

  private validateBalance(): void {
    if (this.balance < 0) {
      throw new ValidationException('잔액은 0 이상이어야 합니다');
    }
  }

  /**
   * 잔액 충전 및 로그 생성
   * RF-021: 시스템은 사용자 잔액이 변경될 때마다 잔액 변경 로그를 기록해야 한다
   * BR-021: amount는 0이 될 수 없으며, 증액은 양수(+)로 기록한다
   */
  charge(
    amount: number,
    note: string | null = null,
    refId?: number,
  ): UserBalanceChangeLog {
    if (amount <= 0) {
      throw new ValidationException('충전 금액은 0보다 커야 합니다');
    }

    const beforeAmount = this.balance;
    this.balance += amount;
    const afterAmount = this.balance;
    this.updatedAt = new Date();

    return UserBalanceChangeLog.create(
      this.id,
      amount,
      beforeAmount,
      afterAmount,
      BalanceChangeCode.SYSTEM_CHARGE,
      note,
      refId ?? null,
    );
  }

  /**
   * 잔액 차감 및 로그 생성
   * BR-011: 주문 총액이 사용자 잔액을 초과할 수 없다
   * RF-021: 시스템은 사용자 잔액이 변경될 때마다 잔액 변경 로그를 기록해야 한다
   * BR-021: amount는 0이 될 수 없으며, 차감은 음수(-)로 기록한다
   */
  deduct(
    amount: number,
    note: string | null = null,
    refId: number,
  ): UserBalanceChangeLog {
    if (amount <= 0) {
      throw new ValidationException('차감 금액은 0보다 커야 합니다');
    }
    if (this.balance < amount) {
      throw new DomainException(ErrorCode.INSUFFICIENT_BALANCE);
    }

    const beforeAmount = this.balance;
    this.balance -= amount;
    const afterAmount = this.balance;
    this.updatedAt = new Date();

    return UserBalanceChangeLog.create(
      this.id,
      -amount, // 차감은 음수
      beforeAmount,
      afterAmount,
      BalanceChangeCode.PAYMENT,
      note,
      refId,
    );
  }

  /**
   * 잔액 조정 및 로그 생성 (관리자용)
   * amount가 양수면 증액, 음수면 차감
   */
  adjust(
    amount: number,
    note: string | null = null,
    refId?: number,
  ): UserBalanceChangeLog {
    if (amount === 0) {
      throw new ValidationException('조정 금액은 0이 될 수 없습니다');
    }

    const beforeAmount = this.balance;
    this.balance += amount;

    if (this.balance < 0) {
      this.balance = beforeAmount; // 롤백
      throw new ValidationException('잔액은 0 미만이 될 수 없습니다');
    }

    const afterAmount = this.balance;
    this.updatedAt = new Date();

    return UserBalanceChangeLog.create(
      this.id,
      amount,
      beforeAmount,
      afterAmount,
      BalanceChangeCode.ADJUST,
      note,
      refId ?? null,
    );
  }
}
