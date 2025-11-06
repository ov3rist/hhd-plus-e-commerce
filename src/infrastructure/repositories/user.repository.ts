import { Injectable } from '@nestjs/common';
import {
  IUserRepository,
  IUserBalanceChangeLogRepository,
} from '@application/interfaces';
import { User } from '@domain/user/user.entity';
import { UserBalanceChangeLog } from '@domain/user/user-balance-change-log.entity';

/**
 * User Repository Implementation (In-Memory)
 */
@Injectable()
export class UserRepository implements IUserRepository {
  private users: Map<number, User> = new Map();
  private currentId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async save(user: User): Promise<User> {
    if (user.id === 0) {
      const newUser = new User(
        this.currentId++,
        user.balance,
        user.createdAt,
        user.updatedAt,
      );
      this.users.set(newUser.id, newUser);
      return newUser;
    }

    this.users.set(user.id, user);
    return user;
  }
}

/**
 * UserBalanceChangeLog Repository Implementation (In-Memory)
 */
@Injectable()
export class UserBalanceChangeLogRepository
  implements IUserBalanceChangeLogRepository
{
  private logs: Map<number, UserBalanceChangeLog> = new Map();
  private currentId = 1;

  async save(log: UserBalanceChangeLog): Promise<UserBalanceChangeLog> {
    const newLog = new UserBalanceChangeLog(
      this.currentId++,
      log.userId,
      log.amount,
      log.beforeAmount,
      log.afterAmount,
      log.code,
      log.note,
      log.refId,
      log.createdAt,
    );
    this.logs.set(newLog.id, newLog);
    return newLog;
  }

  async findByUserId(userId: number): Promise<UserBalanceChangeLog[]> {
    return Array.from(this.logs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByUserIdWithFilter(
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
  }> {
    let filteredLogs = Array.from(this.logs.values()).filter(
      (log) => log.userId === userId,
    );

    // 날짜 필터
    if (filter.from) {
      filteredLogs = filteredLogs.filter(
        (log) => log.createdAt >= filter.from!,
      );
    }
    if (filter.to) {
      filteredLogs = filteredLogs.filter((log) => log.createdAt <= filter.to!);
    }

    // 코드 필터
    if (filter.code) {
      filteredLogs = filteredLogs.filter((log) => log.code === filter.code);
    }

    // refId 필터
    if (filter.refId !== undefined) {
      filteredLogs = filteredLogs.filter((log) => log.refId === filter.refId);
    }

    // 정렬 (최신순)
    filteredLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filteredLogs.length;

    // 페이지네이션
    const page = filter.page || 1;
    const size = filter.size || 20;
    const start = (page - 1) * size;
    const end = start + size;

    return {
      logs: filteredLogs.slice(start, end),
      total,
    };
  }
}
