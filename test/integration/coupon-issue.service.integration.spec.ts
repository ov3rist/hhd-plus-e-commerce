import { CouponService } from '@application/coupon.service';
import {
  CouponRepository,
  UserCouponRepository,
} from '@infrastructure/repositories';
import { Coupon } from '@domain/coupon/coupon.entity';

describe('CouponService Integration Tests', () => {
  let couponRepository: CouponRepository;

  beforeEach(() => {
    couponRepository = new CouponRepository();
  });

  describe('쿠폰 발급 동시성 제어 (Coupon.issuedQuantity)', () => {
    it('동시에 100번 발급 시도 시 정확히 10개만 발급된다', async () => {
      // Given: 총 10개 쿠폰
      const coupon = await couponRepository.save(
        new Coupon(
          0,
          '선착순 쿠폰',
          30,
          10,
          0,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          new Date(),
          new Date(),
        ),
      );

      // When: 100번 동시에 발급 시도 (직접 coupon.issue() 호출)
      const results = await Promise.allSettled(
        Array.from({ length: 100 }, async () => {
          const c = await couponRepository.findById(coupon.id);
          if (c) {
            c.issue();
            await couponRepository.save(c);
          }
        }),
      );

      // Then: 정확히 10개만 발급 성공
      const finalCoupon = await couponRepository.findById(coupon.id);
      expect(finalCoupon!.issuedQuantity).toBe(10);
    });
  });
});
