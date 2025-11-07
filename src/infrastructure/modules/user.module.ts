import { Module } from '@nestjs/common';
import { UserService } from '@application/user.service';
import {
  IUserRepository,
  IUserBalanceChangeLogRepository,
} from '@application/interfaces';
import {
  UserRepository,
  UserBalanceChangeLogRepository,
} from '@infrastructure/repositories';
import { UserController } from '@presentation/user';

/**
 * User Module
 * 사용자 및 잔액 관리 모듈
 */
@Module({
  controllers: [UserController],
  providers: [
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: IUserBalanceChangeLogRepository,
      useClass: UserBalanceChangeLogRepository,
    },
    UserService,
  ],
  exports: [UserService],
})
export class UserModule {}
