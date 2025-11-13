// CART FACADE

import { Coupon, CouponDomainService, UserCoupon } from '@domain/coupon';
import { Product, ProductDomainService, ProductOption } from '@domain/product';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export interface UserCouponView {
  userCouponId: number;
  couponName: string;
  discountRate: number;
  expiredAt: Date;
}

@Injectable()
export class CouponFacade {
  constructor(
    private readonly couponService: CouponDomainService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * ANCHOR 장바구니-상품옵션 조회 뷰 반환
   *
   * TODO: [성능 개선 필요] N+1 쿼리 문제
   * 원인: 각 사용자 쿠폰마다 개별적으로 쿠폰 정보를 조회
   * - userCoupons.length만큼 couponService.getCoupon() 호출
   *
   * 개선 방안:
   * 1. Repository에 IN 절을 사용한 일괄 조회 메서드 추가
   *    - findManyByIds(ids: number[]): Promise<Coupon[]>
   * 2. 또는 JOIN을 활용한 단일 쿼리로 최적화
   *    - user_coupons LEFT JOIN coupons
   *
   * 예상 효과: O(n) 쿼리 → O(1) 쿼리로 개선
   */
  async getUserCoupons(userId: number): Promise<UserCouponView[]> {
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
  async issueCoupon(userId: number, couponId: number): Promise<UserCouponView> {
    return await this.prisma.runInTransaction(async () => {
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
    });
  }
}
