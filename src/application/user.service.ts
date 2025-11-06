import { Injectable } from '@nestjs/common';
import { IUserRepository, IUserBalanceChangeLogRepository } from './interfaces';
import { User } from '@domain/user/user.entity';
import { UserBalanceChangeLog } from '@domain/user/user-balance-change-log.entity';
import { GetBalanceResponseDto } from '@presentation/user/dto';
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
}
