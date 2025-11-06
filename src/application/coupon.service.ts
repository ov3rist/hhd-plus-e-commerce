import { Injectable } from '@nestjs/common';
import { ICouponRepository, IUserCouponRepository } from './interfaces';
import { UserCoupon } from '@domain/coupon/user-coupon.entity';
import { IssueCouponResponseDto } from '@presentation/coupon/dto';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

/**
 * Coupon Service
 * 쿠폰 발급 및 조회 유스케이스
 */
@Injectable()
export class CouponService {
  constructor(
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
  ) {}

  /**
   * 쿠폰 발급 (US-013)
   * 선착순으로 쿠폰을 발급
   * TODO: 동시성 처리 구현 필요
   */
  async issueCoupon(
    userId: number,
    couponId: number,
  ): Promise<IssueCouponResponseDto> {
    // 쿠폰 조회
    const coupon = await this.couponRepository.findById(couponId);
    if (!coupon) {
      throw new DomainException(ErrorCode.COUPON_NOT_FOUND);
    }

    // 중복 발급 확인
    const existingUserCoupon =
      await this.userCouponRepository.findByUserIdAndCouponId(userId, couponId);
    if (existingUserCoupon) {
      throw new DomainException(ErrorCode.ALREADY_ISSUED);
    }

    // 발급 가능 여부 확인 및 발급
    coupon.issue();
    const savedCoupon = await this.couponRepository.save(coupon);

    // 사용자 쿠폰 생성
    const userCoupon = UserCoupon.issue(userId, coupon);
    const savedUserCoupon = await this.userCouponRepository.save(userCoupon);

    return {
      userCouponId: savedUserCoupon.id,
      couponName: savedCoupon.name,
      discountRate: savedCoupon.discountRate,
      expiresAt: savedUserCoupon.expiredAt,
      remainingQuantity: savedCoupon.getRemainingQuantity(),
    };
  }
}
