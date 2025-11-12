import { Module } from '@nestjs/common';
import { UserFacade } from '@application/facades/user.facade';
import { UserDomainService } from '@domain/user';
import {
  IUserRepository,
  IUserBalanceChangeLogRepository,
} from '@domain/interfaces';
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
    UserRepository,
    UserBalanceChangeLogRepository,
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: IUserBalanceChangeLogRepository,
      useClass: UserBalanceChangeLogRepository,
    },
    UserDomainService,
    UserFacade,
  ],
  exports: [UserFacade],
})
export class UserModule {}
