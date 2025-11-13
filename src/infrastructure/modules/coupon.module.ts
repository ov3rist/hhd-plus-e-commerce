import { Module } from '@nestjs/common';
import { CouponFacade } from '@application/facades/coupon.facade';
import { CouponDomainService } from '@domain/coupon';
import { ICouponRepository, IUserCouponRepository } from '@domain/interfaces';
import {
  CouponRepository,
  UserCouponRepository,
} from '@infrastructure/repositories';
import { CouponController } from '@presentation/coupon';

/**
 * Coupon Module
 * 쿠폰 관리 모듈
 */
@Module({
  controllers: [CouponController],
  providers: [
    // Coupon Repositories
    CouponRepository,
    {
      provide: ICouponRepository,
      useClass: CouponRepository,
    },
    UserCouponRepository,
    {
      provide: IUserCouponRepository,
      useClass: UserCouponRepository,
    },

    // Domain Service
    CouponDomainService,

    // Facade
    CouponFacade,
  ],
  exports: [CouponDomainService, ICouponRepository, IUserCouponRepository],
})
export class CouponModule {}
