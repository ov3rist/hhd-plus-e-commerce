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
    CouponRepository,
    UserCouponRepository,
    {
      provide: ICouponRepository,
      useClass: CouponRepository,
    },
    {
      provide: IUserCouponRepository,
      useClass: UserCouponRepository,
    },
    CouponDomainService,
    CouponFacade,
  ],
  exports: [CouponFacade],
})
export class CouponModule {}
