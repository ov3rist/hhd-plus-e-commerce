import { Injectable } from '@nestjs/common';
import {
  ICouponRepository,
  IUserCouponRepository,
} from '@application/interfaces';
import { Coupon } from '@domain/coupon/coupon.entity';
import { UserCoupon } from '@domain/coupon/user-coupon.entity';
import { MutexManager } from '@infrastructure/common/mutex-manager';

/**
 * Coupon Repository Implementation (In-Memory)
 * 동시성 제어: 쿠폰별 발급 수량 증가 시 Mutex를 통한 직렬화 보장
 */
@Injectable()
export class CouponRepository implements ICouponRepository {
  private coupons: Map<number, Coupon> = new Map();
  private currentId = 1;
  private readonly mutexManager = new MutexManager();

  async findById(id: number): Promise<Coupon | null> {
    return this.coupons.get(id) || null;
  }

  async findAll(): Promise<Coupon[]> {
    return Array.from(this.coupons.values());
  }

  async save(coupon: Coupon): Promise<Coupon> {
    const couponId = coupon.id || 0;
    const unlock = await this.mutexManager.acquire(couponId);

    try {
      if (coupon.id === 0) {
        const newCoupon = new Coupon(
          this.currentId++,
          coupon.name,
          coupon.discountRate,
          coupon.totalQuantity,
          coupon.issuedQuantity,
          coupon.expiredAt,
          coupon.createdAt,
          coupon.updatedAt,
        );
        this.coupons.set(newCoupon.id, newCoupon);
        return newCoupon;
      }

      this.coupons.set(coupon.id, coupon);
      return coupon;
    } finally {
      unlock();
    }
  }
}

/**
 * UserCoupon Repository Implementation (In-Memory)
 */
@Injectable()
export class UserCouponRepository implements IUserCouponRepository {
  private userCoupons: Map<number, UserCoupon> = new Map();
  private currentId = 1;

  async findById(id: number): Promise<UserCoupon | null> {
    return this.userCoupons.get(id) || null;
  }

  async findByUserId(userId: number): Promise<UserCoupon[]> {
    return Array.from(this.userCoupons.values()).filter(
      (uc) => uc.userId === userId,
    );
  }

  async findByUserIdAndCouponId(
    userId: number,
    couponId: number,
  ): Promise<UserCoupon | null> {
    return (
      Array.from(this.userCoupons.values()).find(
        (uc) => uc.userId === userId && uc.couponId === couponId,
      ) || null
    );
  }

  async save(userCoupon: UserCoupon): Promise<UserCoupon> {
    if (userCoupon.id === 0) {
      const newUserCoupon = new UserCoupon(
        this.currentId++,
        userCoupon.userId,
        userCoupon.couponId,
        userCoupon.orderId,
        userCoupon.createdAt,
        userCoupon.usedAt,
        userCoupon.expiredAt,
        userCoupon.updatedAt,
      );
      this.userCoupons.set(newUserCoupon.id, newUserCoupon);
      return newUserCoupon;
    }

    this.userCoupons.set(userCoupon.id, userCoupon);
    return userCoupon;
  }
}
