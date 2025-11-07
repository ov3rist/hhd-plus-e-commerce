import { Module } from '@nestjs/common';
import { CouponService } from '@application/coupon.service';
import {
  ICouponRepository,
  IUserCouponRepository,
} from '@application/interfaces';
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
    CouponService,
  ],
  exports: [CouponService],
})
export class CouponModule {}
