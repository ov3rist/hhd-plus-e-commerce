import { Injectable } from '@nestjs/common';
import {
  IUserBalanceChangeLogRepository,
  IUserRepository,
} from '@domain/interfaces';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';
import { User } from './user.entity';
import { UserBalanceChangeLog } from './user-balance-change-log.entity';

export interface BalanceLogQuery {
  from?: Date;
  to?: Date;
  code?: string;
  refId?: number;
  page?: number;
  size?: number;
}

export interface BalanceLogResult {
  logs: UserBalanceChangeLog[];
  total: number;
}

/**
 * UserDomainService
 * 사용자 잔액 관련 핵심 규칙 담당.
 */
@Injectable()
export class UserDomainService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly balanceLogRepository: IUserBalanceChangeLogRepository,
  ) {}

  /**
   * 사용자 조회 (없으면 예외)
   */
  async loadUserOrFail(userId: number): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  /**
   * 잔액 변경 로그 조회
   */
  async fetchBalanceLogs(
    userId: number,
    filter: BalanceLogQuery,
  ): Promise<BalanceLogResult> {
    return this.balanceLogRepository.findByUserIdWithFilter(userId, filter);
  }

  /**
   * 잔액 충전 처리
   */
  chargeUser(
    user: User,
    amount: number,
    note: string | null = '관리자 잔액 충전',
    refId?: number,
  ): UserBalanceChangeLog {
    return user.charge(amount, note, refId);
  }

  /**
   * 잔액 차감 처리
   */
  deductUser(
    user: User,
    amount: number,
    note: string | null,
    refId: number,
  ): UserBalanceChangeLog {
    return user.deduct(amount, note, refId);
  }

  /**
   * 사용자 저장
   */
  async persistUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  /**
   * 잔액 로그 저장
   */
  async persistBalanceLog(
    log: UserBalanceChangeLog,
  ): Promise<UserBalanceChangeLog> {
    return this.balanceLogRepository.save(log);
  }
}
