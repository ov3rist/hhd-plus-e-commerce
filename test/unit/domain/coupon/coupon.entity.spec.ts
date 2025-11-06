import { Coupon } from '@domain/coupon';
import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

describe('Coupon Entity', () => {
  const validCouponData = {
    id: 1,
    name: '신규 가입 쿠폰',
    discountRate: 10,
    totalQuantity: 100,
    issuedQuantity: 0,
    expiredAt: new Date('2025-12-31'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 Coupon을 생성할 수 있다', () => {
      // when
      const coupon = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        validCouponData.totalQuantity,
        validCouponData.issuedQuantity,
        validCouponData.expiredAt,
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // then
      expect(coupon.id).toBe(validCouponData.id);
      expect(coupon.name).toBe(validCouponData.name);
      expect(coupon.discountRate).toBe(validCouponData.discountRate);
      expect(coupon.totalQuantity).toBe(validCouponData.totalQuantity);
      expect(coupon.issuedQuantity).toBe(validCouponData.issuedQuantity);
      expect(coupon.expiredAt).toEqual(validCouponData.expiredAt);
      expect(coupon.createdAt).toEqual(validCouponData.createdAt);
      expect(coupon.updatedAt).toEqual(validCouponData.updatedAt);
    });

    describe('할인율 검증', () => {
      it('할인율이 0 이하 또는 100 초과이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Coupon(
            validCouponData.id,
            validCouponData.name,
            0,
            validCouponData.totalQuantity,
            validCouponData.issuedQuantity,
            validCouponData.expiredAt,
            validCouponData.createdAt,
            validCouponData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Coupon(
            validCouponData.id,
            validCouponData.name,
            -10,
            validCouponData.totalQuantity,
            validCouponData.issuedQuantity,
            validCouponData.expiredAt,
            validCouponData.createdAt,
            validCouponData.updatedAt,
          );
        }).toThrow('할인율은 0보다 크고 100 이하여야 합니다');

        expect(() => {
          new Coupon(
            validCouponData.id,
            validCouponData.name,
            101,
            validCouponData.totalQuantity,
            validCouponData.issuedQuantity,
            validCouponData.expiredAt,
            validCouponData.createdAt,
            validCouponData.updatedAt,
          );
        }).toThrow(ValidationException);
      });

      it('할인율이 1~100이면 생성할 수 있다 (경계값)', () => {
        // when
        const coupon1 = new Coupon(
          validCouponData.id,
          validCouponData.name,
          1,
          validCouponData.totalQuantity,
          validCouponData.issuedQuantity,
          validCouponData.expiredAt,
          validCouponData.createdAt,
          validCouponData.updatedAt,
        );
        const coupon100 = new Coupon(
          validCouponData.id,
          validCouponData.name,
          100,
          validCouponData.totalQuantity,
          validCouponData.issuedQuantity,
          validCouponData.expiredAt,
          validCouponData.createdAt,
          validCouponData.updatedAt,
        );

        // then
        expect(coupon1.discountRate).toBe(1);
        expect(coupon100.discountRate).toBe(100);
      });
    });

    describe('수량 검증', () => {
      it('총 수량 또는 발급 수량이 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Coupon(
            validCouponData.id,
            validCouponData.name,
            validCouponData.discountRate,
            -1,
            validCouponData.issuedQuantity,
            validCouponData.expiredAt,
            validCouponData.createdAt,
            validCouponData.updatedAt,
          );
        }).toThrow('총 수량은 0 이상이어야 합니다');

        expect(() => {
          new Coupon(
            validCouponData.id,
            validCouponData.name,
            validCouponData.discountRate,
            validCouponData.totalQuantity,
            -1,
            validCouponData.expiredAt,
            validCouponData.createdAt,
            validCouponData.updatedAt,
          );
        }).toThrow('발급된 수량은 0 이상이어야 합니다');
      });

      it('발급된 수량이 총 수량을 초과하면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Coupon(
            validCouponData.id,
            validCouponData.name,
            validCouponData.discountRate,
            100,
            101,
            validCouponData.expiredAt,
            validCouponData.createdAt,
            validCouponData.updatedAt,
          );
        }).toThrow('발급된 수량이 총 수량을 초과할 수 없습니다');
      });
    });
  });

  describe('canIssue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('발급 가능한 쿠폰은 true, 품절/만료는 false를 반환한다', () => {
      // given: 발급 가능
      jest.setSystemTime(new Date('2025-06-01'));
      const coupon1 = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        100,
        50,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      expect(coupon1.canIssue()).toBe(true);

      // given: 품절
      const coupon2 = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        100,
        100,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      expect(coupon2.canIssue()).toBe(false);

      // given: 만료
      jest.setSystemTime(new Date('2026-01-01'));
      const coupon3 = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        100,
        50,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      expect(coupon3.canIssue()).toBe(false);
    });
  });

  describe('isExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('만료일 기준으로 true/false를 반환한다', () => {
      // given
      const coupon = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        validCouponData.totalQuantity,
        validCouponData.issuedQuantity,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then: 만료일 이전
      jest.setSystemTime(new Date('2025-06-01'));
      expect(coupon.isExpired()).toBe(false);

      // when & then: 만료일 이후
      jest.setSystemTime(new Date('2026-01-01'));
      expect(coupon.isExpired()).toBe(true);
    });
  });

  describe('issue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('발급 가능한 쿠폰은 발급 수량을 증가시키고 updatedAt을 갱신한다', () => {
      // given
      const originalUpdatedAt = new Date('2025-01-01');
      jest.setSystemTime(new Date('2025-06-01'));
      const coupon = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        100,
        50,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        originalUpdatedAt,
      );

      const newTime = new Date('2025-06-02');
      jest.setSystemTime(newTime);

      // when
      coupon.issue();

      // then
      expect(coupon.issuedQuantity).toBe(51);
      expect(coupon.updatedAt).toEqual(newTime);
      expect(coupon.updatedAt).not.toEqual(originalUpdatedAt);
    });

    it('만료/품절된 쿠폰은 DomainException을 던진다', () => {
      // given: 만료
      jest.setSystemTime(new Date('2026-01-01'));
      const expiredCoupon = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        100,
        50,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      try {
        expiredCoupon.issue();
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.EXPIRED_COUPON,
        );
      }

      // given: 품절
      jest.setSystemTime(new Date('2025-06-01'));
      const soldOutCoupon = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        100,
        100,
        new Date('2025-12-31'),
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      try {
        soldOutCoupon.issue();
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.COUPON_SOLD_OUT,
        );
      }
    });
  });

  describe('calculateDiscount', () => {
    it('할인 금액을 정확히 계산하고 소숫점 첫 번째 자리에서 버린다 (BR-010)', () => {
      // given
      const coupon10 = new Coupon(
        validCouponData.id,
        validCouponData.name,
        10, // 10% 할인
        validCouponData.totalQuantity,
        validCouponData.issuedQuantity,
        validCouponData.expiredAt,
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );
      const coupon15 = new Coupon(
        validCouponData.id,
        validCouponData.name,
        15, // 15% 할인
        validCouponData.totalQuantity,
        validCouponData.issuedQuantity,
        validCouponData.expiredAt,
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      expect(coupon10.calculateDiscount(10000)).toBe(1000); // 10000 * 0.1 = 1000
      expect(coupon15.calculateDiscount(1000)).toBe(150); // 1000 * 0.15 = 150.0
      expect(coupon10.calculateDiscount(1234)).toBe(123); // 1234 * 0.1 = 123.4 -> 123 (버림)
      expect(coupon10.calculateDiscount(0)).toBe(0); // 금액 0
    });

    it('금액이 음수이면 ValidationException을 던진다', () => {
      // given
      const coupon = new Coupon(
        validCouponData.id,
        validCouponData.name,
        validCouponData.discountRate,
        validCouponData.totalQuantity,
        validCouponData.issuedQuantity,
        validCouponData.expiredAt,
        validCouponData.createdAt,
        validCouponData.updatedAt,
      );

      // when & then
      expect(() => coupon.calculateDiscount(-1000)).toThrow(
        '금액은 0 이상이어야 합니다',
      );
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
