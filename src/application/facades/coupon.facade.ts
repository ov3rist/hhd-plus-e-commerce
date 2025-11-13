// CART FACADE

import { Coupon, CouponDomainService, UserCoupon } from '@domain/coupon';
import { Product, ProductDomainService, ProductOption } from '@domain/product';
import { Injectable } from '@nestjs/common';

export interface CouponViewDto {
  userCouponId: number;
  couponName: string;
  discountRate: number;
  expiredAt: Date;
}

@Injectable()
export class CouponFacade {
  constructor(private readonly couponService: CouponDomainService) {}

  /**
   * ANCHOR 장바구니-상품옵션 조회 뷰 반환
   */
  async getUserCoupons(userId: number): Promise<CouponViewDto[]> {
    // 사용자 쿠폰 조회
    const userCoupons = await this.couponService.getUserCoupons(userId);
    const couponIds = userCoupons.map((uc) => uc.couponId);

    // 쿠폰 조회 및 뷰 매핑
    const coupons = await Promise.all(
      couponIds.map((id) => this.couponService.getCoupon(id)),
    );
    const couponMap = new Map<number, Coupon>();
    coupons.forEach((coupon) => couponMap.set(coupon.id, coupon));

    return userCoupons.map((uc) => ({
      userCouponId: uc.id,
      couponName: couponMap.get(uc.couponId)!.name,
      discountRate: couponMap.get(uc.couponId)!.discountRate,
      expiredAt: couponMap.get(uc.couponId)!.expiredAt,
    }));
  }

  /**
   * ANCHOR 쿠폰 발급
   * @param userId
   * @param coupon
   */
  async issueCoupon(userId: number, couponId: number): Promise<CouponViewDto> {
    const coupon = await this.couponService.getCoupon(couponId);
    const issuedCoupon = await this.couponService.issueCouponToUser(
      userId,
      coupon,
    );

    return {
      userCouponId: issuedCoupon.id,
      couponName: coupon.name,
      discountRate: coupon.discountRate,
      expiredAt: coupon.expiredAt,
    };
  }
}
