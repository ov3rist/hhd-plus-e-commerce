import { Injectable } from '@nestjs/common';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';
import { Coupon } from './coupon.entity';
import { UserCoupon } from './user-coupon.entity';
import { ICouponRepository, IUserCouponRepository } from '@domain/interfaces';

export interface IssuedCouponContext {
  coupon: Coupon;
  userCoupon: UserCoupon;
}

export interface UserCouponSnapshot {
  coupon: Coupon;
  userCoupon: UserCoupon;
}

/**
 * CouponDomainService
 * 쿠폰 발급 및 조회에 대한 핵심 규칙을 담당한다.
 */
@Injectable()
export class CouponDomainService {
  constructor(
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
  ) {}

  /**
   * 쿠폰 로드 (없으면 예외)
   */
  async loadCouponOrFail(couponId: number): Promise<Coupon> {
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new DomainException(ErrorCode.COUPON_NOT_FOUND);
    }
    return coupon;
  }

  /**
   * 중복 발급 여부 검증
   */
  async ensureUserHasNotReceived(
    userId: number,
    couponId: number,
  ): Promise<void> {
    const existing = await this.userCouponRepository.findByUserIdAndCouponId(
      userId,
      couponId,
    );
    if (existing) {
      throw new DomainException(ErrorCode.ALREADY_ISSUED);
    }
  }

  /**
   * 쿠폰 발급 처리
   */
  async issueCouponToUser(
    userId: number,
    coupon: Coupon,
  ): Promise<IssuedCouponContext> {
    coupon.issue();
    const savedCoupon = await this.couponRepository.save(coupon);

    const userCoupon = UserCoupon.issue(userId, savedCoupon);
    const savedUserCoupon = await this.userCouponRepository.save(userCoupon);

    return {
      coupon: savedCoupon,
      userCoupon: savedUserCoupon,
    };
  }

  /**
   * 사용자 쿠폰 목록 조회
   */
  async fetchUserCoupons(
    userId: number,
    statusFilter?: string,
  ): Promise<UserCouponSnapshot[]> {
    const userCoupons = await this.userCouponRepository.findByUserId(userId);

    const filtered = statusFilter
      ? userCoupons.filter((coupon) => coupon.getStatus() === statusFilter)
      : userCoupons;

    if (filtered.length === 0) {
      return [];
    }

    const couponCache = new Map<number, Coupon>();
    const snapshots: UserCouponSnapshot[] = [];

    for (const userCoupon of filtered) {
      const coupon = await this.resolveCoupon(userCoupon.couponId, couponCache);
      snapshots.push({ coupon, userCoupon });
    }

    return snapshots;
  }

  private async resolveCoupon(
    couponId: number,
    cache: Map<number, Coupon>,
  ): Promise<Coupon> {
    if (cache.has(couponId)) {
      return cache.get(couponId)!;
    }

    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new DomainException(ErrorCode.COUPON_INFO_NOT_FOUND);
    }

    cache.set(couponId, coupon);
    return coupon;
  }
}
