import { User } from '@domain/user/user.entity';
import { UserBalanceChangeLog } from '@domain/user/user-balance-change-log.entity';

/**
 * User Repository Port
 * 사용자 데이터 접근 계약
 */
export abstract class IUserRepository {
  abstract findById(id: number): Promise<User | null>;
  abstract save(user: User): Promise<User>;
}

/**
 * UserBalanceChangeLog Repository Port
 * 사용자 잔액 변경 로그 데이터 접근 계약
 */
export abstract class IUserBalanceChangeLogRepository {
  abstract save(log: UserBalanceChangeLog): Promise<UserBalanceChangeLog>;
  abstract findByUserId(userId: number): Promise<UserBalanceChangeLog[]>;
  abstract findByUserIdWithFilter(
    userId: number,
    filter: {
      from?: Date;
      to?: Date;
      code?: string;
      refId?: number;
      page?: number;
      size?: number;
    },
  ): Promise<{
    logs: UserBalanceChangeLog[];
    total: number;
  }>;
}
