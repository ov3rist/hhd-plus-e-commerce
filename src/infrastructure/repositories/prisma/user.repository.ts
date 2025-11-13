import { Injectable } from '@nestjs/common';
import {
  IUserRepository,
  IUserBalanceChangeLogRepository,
} from '@domain/interfaces';
import { User } from '@domain/user/user.entity';
import { UserBalanceChangeLog } from '@domain/user/user-balance-change-log.entity';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

/**
 * User Repository Implementation (Prisma)
 * 동시성 제어: 트랜잭션 컨텍스트에서 FOR UPDATE를 통한 비관적 잠금
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 트랜잭션 컨텍스트가 있다면 해당 클라이언트를, 없다면 기본 클라이언트를 돌려준다.
   */
  private get prismaClient(): Prisma.TransactionClient | PrismaService {
    return this.prisma.getClient();
  }

  // ANCHOR user.findById
  async findById(id: number): Promise<User | null> {
    const tx = this.prisma.getTransactionClient();

    // 트랜잭션 컨텍스트가 있으면 FOR UPDATE 사용
    if (tx) {
      const recordList: any[] =
        await tx.$queryRaw`SELECT * FROM users WHERE id = ${id} FOR UPDATE`;
      const record = recordList.length > 0 ? recordList[0] : null;
      return record ? this.mapToDomain(record) : null;
    }

    // 트랜잭션 컨텍스트가 없으면 일반 조회
    const record = await this.prismaClient.users.findUnique({ where: { id } });
    return record ? this.mapToDomain(record) : null;
  }

  // ANCHOR user.create
  async create(user: User): Promise<User> {
    const created = await this.prismaClient.users.create({
      data: {
        balance: user.balance,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
    return this.mapToDomain(created);
  }

  // ANCHOR user.update
  async update(user: User): Promise<User> {
    const updated = await this.prismaClient.users.update({
      where: { id: user.id },
      data: {
        balance: user.balance,
        updated_at: user.updatedAt,
      },
    });
    return this.mapToDomain(updated);
  }

  /**
   * Helper 도메인 맵퍼
   */
  private mapToDomain(record: any): User {
    const maybeDecimal = record.balance as { toNumber?: () => number };
    const balance =
      typeof maybeDecimal?.toNumber === 'function'
        ? maybeDecimal.toNumber()
        : Number(record.balance);
    return new User(record.id, balance, record.created_at, record.updated_at);
  }
}

/**
 * UserBalanceChangeLog Repository Implementation (Prisma)
 */
@Injectable()
export class UserBalanceChangeLogRepository
  implements IUserBalanceChangeLogRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private get prismaClient(): Prisma.TransactionClient | PrismaService {
    return this.prisma.getClient();
  }

  // ANCHOR userBalanceChangeLog.create
  async create(log: UserBalanceChangeLog): Promise<UserBalanceChangeLog> {
    const created = await this.prismaClient.user_balance_change_log.create({
      data: {
        user_id: log.userId,
        amount: log.amount,
        before_amount: log.beforeAmount,
        after_amount: log.afterAmount,
        code: log.code,
        note: log.note,
        ref_id: log.refId,
        created_at: log.createdAt,
      },
    });
    return this.mapToDomain(created);
  }

  // ANCHOR userBalanceChangeLog.findByUserId
  async findByUserId(userId: number): Promise<UserBalanceChangeLog[]> {
    const records = await this.prismaClient.user_balance_change_log.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return records.map((record) => this.mapToDomain(record));
  }

  /**
   * Helper 도메인 맵퍼
   */
  private mapToDomain(record: any): UserBalanceChangeLog {
    const toNumber = (value: any): number => {
      const maybeDecimal = value as { toNumber?: () => number };
      return typeof maybeDecimal?.toNumber === 'function'
        ? maybeDecimal.toNumber()
        : Number(value);
    };

    return new UserBalanceChangeLog(
      Number(record.id),
      record.user_id,
      toNumber(record.amount),
      toNumber(record.before_amount),
      toNumber(record.after_amount),
      record.code,
      record.note,
      record.ref_id ? Number(record.ref_id) : null,
      record.created_at,
    );
  }
}
