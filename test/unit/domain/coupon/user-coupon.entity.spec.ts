import { Coupon, UserCoupon } from '@domain/coupon';
import { ErrorCode } from '@domain/common/constants/error-code';
import { DomainException } from '@domain/common/exceptions';

describe('UserCoupon Entity', () => {
  const validUserCouponData = {
    id: 1,
    userId: 100,
    couponId: 1,
    orderId: null,
    createdAt: new Date('2025-01-01'),
    usedAt: null,
    expiredAt: new Date('2025-12-31'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 UserCoupon을 생성할 수 있다', () => {
      // when
      const userCoupon = new UserCoupon(
        validUserCouponData.id,
        validUserCouponData.userId,
        validUserCouponData.couponId,
        validUserCouponData.orderId,
        validUserCouponData.createdAt,
        validUserCouponData.usedAt,
        validUserCouponData.expiredAt,
        validUserCouponData.updatedAt,
      );

      // then
      expect(userCoupon.id).toBe(validUserCouponData.id);
      expect(userCoupon.userId).toBe(validUserCouponData.userId);
      expect(userCoupon.couponId).toBe(validUserCouponData.couponId);
      expect(userCoupon.orderId).toBe(validUserCouponData.orderId);
      expect(userCoupon.createdAt).toEqual(validUserCouponData.createdAt);
      expect(userCoupon.usedAt).toBe(validUserCouponData.usedAt);
      expect(userCoupon.expiredAt).toEqual(validUserCouponData.expiredAt);
      expect(userCoupon.updatedAt).toEqual(validUserCouponData.updatedAt);
    });
  });

  describe('issue (정적 팩토리 메서드)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('발급 가능한 쿠폰으로 UserCoupon을 생성한다', () => {
      // given
      jest.setSystemTime(new Date('2025-06-01'));
      const userId = 100;
      const coupon = new Coupon(
        1,
        '테스트 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      // when
      const userCoupon = UserCoupon.issue(userId, coupon);

      // then
      expect(userCoupon.userId).toBe(userId);
      expect(userCoupon.couponId).toBe(coupon.id);
      expect(userCoupon.orderId).toBe(null);
      expect(userCoupon.usedAt).toBe(null);
      expect(userCoupon.expiredAt).toEqual(coupon.expiredAt);
    });

    it('만료/품절 쿠폰은 DomainException을 던진다', () => {
      // given: 만료
      jest.setSystemTime(new Date('2026-01-01'));
      const userId = 100;
      const expiredCoupon = new Coupon(
        1,
        '테스트 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      // when & then
      try {
        UserCoupon.issue(userId, expiredCoupon);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.EXPIRED_COUPON,
        );
      }

      // given: 품절
      jest.setSystemTime(new Date('2025-06-01'));
      const soldOutCoupon = new Coupon(
        1,
        '테스트 쿠폰',
        10,
        100,
        100,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      // when & then
      try {
        UserCoupon.issue(userId, soldOutCoupon);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.COUPON_SOLD_OUT,
        );
      }
    });
  });

  describe('isAlreadyIssued (정적 메서드)', () => {
    it('사용자가 발급받은 쿠폰 여부를 반환한다', () => {
      // given
      const existingUserCoupons = [
        new UserCoupon(
          1,
          100,
          1,
          null,
          new Date(),
          null,
          new Date('2025-12-31'),
          new Date(),
        ),
        new UserCoupon(
          2,
          100,
          2,
          null,
          new Date(),
          null,
          new Date('2025-12-31'),
          new Date(),
        ),
      ];

      // when & then
      expect(UserCoupon.isAlreadyIssued(existingUserCoupons, 1)).toBe(true);
      expect(UserCoupon.isAlreadyIssued(existingUserCoupons, 3)).toBe(false);
      expect(UserCoupon.isAlreadyIssued([], 1)).toBe(false);
    });
  });

  describe('canUse', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('사용 가능 여부를 반환한다', () => {
      // given: 사용 가능
      jest.setSystemTime(new Date('2025-06-01'));
      const available = new UserCoupon(
        1,
        100,
        1,
        null,
        new Date('2025-01-01'),
        null,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
      );

      // when & then
      expect(available.canUse()).toBe(true);

      // given: 이미 사용됨
      const used = new UserCoupon(
        1,
        100,
        1,
        999,
        new Date('2025-01-01'),
        new Date('2025-05-01'),
        new Date('2025-12-31'),
        new Date('2025-05-01'),
      );

      // when & then
      expect(used.canUse()).toBe(false);

      // given: 만료됨
      jest.setSystemTime(new Date('2026-01-01'));
      const expired = new UserCoupon(
        1,
        100,
        1,
        null,
        new Date('2025-01-01'),
        null,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
      );

      // when & then
      expect(expired.canUse()).toBe(false);
    });
  });

  describe('use', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('사용 가능한 쿠폰을 사용 처리하고 orderId, usedAt, updatedAt을 갱신한다', () => {
      // given
      const originalUpdatedAt = new Date('2025-01-01');
      jest.setSystemTime(new Date('2025-06-01'));
      const userCoupon = new UserCoupon(
        1,
        100,
        1,
        null,
        new Date('2025-01-01'),
        null,
        new Date('2025-12-31'),
        originalUpdatedAt,
      );

      const orderId = 999;
      const newTime = new Date('2025-06-02');
      jest.setSystemTime(newTime);

      // when
      userCoupon.use(orderId);

      // then
      expect(userCoupon.orderId).toBe(orderId);
      expect(userCoupon.usedAt).toEqual(newTime);
      expect(userCoupon.updatedAt).toEqual(newTime);
      expect(userCoupon.updatedAt).not.toEqual(originalUpdatedAt);
    });

    it('이미 사용/만료된 쿠폰은 DomainException을 던진다', () => {
      // given: 이미 사용됨
      jest.setSystemTime(new Date('2025-06-01'));
      const usedCoupon = new UserCoupon(
        1,
        100,
        1,
        888,
        new Date('2025-01-01'),
        new Date('2025-05-01'),
        new Date('2025-12-31'),
        new Date('2025-05-01'),
      );

      // when & then
      try {
        usedCoupon.use(999);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.ALREADY_USED,
        );
      }

      // given: 만료됨
      jest.setSystemTime(new Date('2026-01-01'));
      const expiredCoupon = new UserCoupon(
        1,
        100,
        1,
        null,
        new Date('2025-01-01'),
        null,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
      );

      // when & then
      try {
        expiredCoupon.use(999);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.EXPIRED_COUPON,
        );
      }
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('쿠폰 상태를 반환한다 (USED > EXPIRED > AVAILABLE 우선순위)', () => {
      // given & when & then: 사용 가능
      jest.setSystemTime(new Date('2025-06-01'));
      const available = new UserCoupon(
        1,
        100,
        1,
        null,
        new Date(),
        null,
        new Date('2025-12-31'),
        new Date(),
      );
      expect(available.getStatus()).toBe('AVAILABLE');

      // given & when & then: 사용됨
      const used = new UserCoupon(
        1,
        100,
        1,
        999,
        new Date(),
        new Date('2025-05-01'),
        new Date('2025-12-31'),
        new Date(),
      );
      expect(used.getStatus()).toBe('USED');

      // given & when & then: 만료됨
      jest.setSystemTime(new Date('2026-01-01'));
      const expired = new UserCoupon(
        1,
        100,
        1,
        null,
        new Date(),
        null,
        new Date('2025-12-31'),
        new Date(),
      );
      expect(expired.getStatus()).toBe('EXPIRED');

      // given & when & then: 사용되고 만료됨 (USED 우선)
      const usedAndExpired = new UserCoupon(
        1,
        100,
        1,
        999,
        new Date(),
        new Date('2025-05-01'),
        new Date('2025-12-31'),
        new Date(),
      );
      expect(usedAndExpired.getStatus()).toBe('USED');
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
