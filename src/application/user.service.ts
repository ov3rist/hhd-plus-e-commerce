import { Injectable } from '@nestjs/common';
import { IUserRepository, IUserBalanceChangeLogRepository } from './interfaces';
import { User } from '@domain/user/user.entity';
import { UserBalanceChangeLog } from '@domain/user/user-balance-change-log.entity';
import {
  GetBalanceResponseDto,
  GetBalanceLogsResponseDto,
  BalanceLogDto,
} from '@presentation/user/dto';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

/**
 * User Service
 * 사용자 잔액 관리 유스케이스
 */
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly balanceLogRepository: IUserBalanceChangeLogRepository,
  ) {}

  /**
   * 잔액 조회 (US-004)
   */
  async getBalance(userId: number): Promise<GetBalanceResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND);
    }
    return {
      userId: user.id,
      balance: user.balance,
    };
  }

  /**
   * 잔액 변경 이력 조회 (US-016)
   */
  async getBalanceLogs(
    userId: number,
    filter: {
      from?: Date;
      to?: Date;
      code?: string;
      refId?: number;
      page?: number;
      size?: number;
    },
  ): Promise<GetBalanceLogsResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND);
    }

    const result = await this.balanceLogRepository.findByUserIdWithFilter(
      userId,
      filter,
    );

    const logs: BalanceLogDto[] = result.logs.map((log) => ({
      logId: log.id,
      userId: log.userId,
      amount: log.amount,
      beforeAmount: log.beforeAmount,
      afterAmount: log.afterAmount,
      code: log.code,
      note: log.note,
      refId: log.refId,
      createdAt: log.createdAt,
    }));

    return {
      logs,
      page: filter.page || 1,
      size: filter.size || 20,
      total: result.total,
    };
  }
}
