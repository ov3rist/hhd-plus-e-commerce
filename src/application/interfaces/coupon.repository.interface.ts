import { Coupon } from '@domain/coupon/coupon.entity';
import { UserCoupon } from '@domain/coupon/user-coupon.entity';

/**
 * Coupon Repository Port
 * 쿠폰 데이터 접근 계약
 */
export abstract class ICouponRepository {
  abstract findById(id: number): Promise<Coupon | null>;
  abstract findAll(): Promise<Coupon[]>;
  abstract save(coupon: Coupon): Promise<Coupon>;
}

/**
 * UserCoupon Repository Port
 * 사용자 쿠폰 데이터 접근 계약
 */
export abstract class IUserCouponRepository {
  abstract findById(id: number): Promise<UserCoupon | null>;
  abstract findByUserId(userId: number): Promise<UserCoupon[]>;
  abstract findByUserIdAndCouponId(
    userId: number,
    couponId: number,
  ): Promise<UserCoupon | null>;
  abstract save(userCoupon: UserCoupon): Promise<UserCoupon>;
}
