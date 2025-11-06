import { Order, OrderStatus } from '@domain/order';
import { Coupon } from '@domain/coupon';
import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

describe('Order Entity', () => {
  const validOrderData = {
    id: 1,
    userId: 100,
    couponId: null as number | null,
    totalAmount: 50000,
    discountAmount: 0,
    finalAmount: 50000,
    status: OrderStatus.PENDING,
    createdAt: new Date('2025-01-01T10:00:00'),
    paidAt: null as Date | null,
    expiredAt: new Date('2025-01-01T10:10:00'), // 10분 후
    updatedAt: new Date('2025-01-01T10:00:00'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 Order를 생성할 수 있다', () => {
      // when
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        validOrderData.status,
        validOrderData.createdAt,
        validOrderData.paidAt,
        validOrderData.expiredAt,
        validOrderData.updatedAt,
      );

      // then
      expect(order.id).toBe(validOrderData.id);
      expect(order.userId).toBe(validOrderData.userId);
      expect(order.couponId).toBe(validOrderData.couponId);
      expect(order.totalAmount).toBe(validOrderData.totalAmount);
      expect(order.discountAmount).toBe(validOrderData.discountAmount);
      expect(order.finalAmount).toBe(validOrderData.finalAmount);
      expect(order.status).toBe(validOrderData.status);
      expect(order.createdAt).toEqual(validOrderData.createdAt);
      expect(order.paidAt).toBe(validOrderData.paidAt);
      expect(order.expiredAt).toEqual(validOrderData.expiredAt);
      expect(order.updatedAt).toEqual(validOrderData.updatedAt);
    });

    describe('금액 검증', () => {
      it('총 금액이 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            -1000,
            validOrderData.discountAmount,
            validOrderData.finalAmount,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            -1000,
            validOrderData.discountAmount,
            validOrderData.finalAmount,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow('총 금액은 0 이상이어야 합니다');
      });

      it('할인 금액이 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            -1000,
            validOrderData.finalAmount,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            -1000,
            validOrderData.finalAmount,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow('할인 금액은 0 이상이어야 합니다');
      });

      it('최종 금액이 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            validOrderData.discountAmount,
            -1000,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            validOrderData.discountAmount,
            -1000,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow('최종 금액은 0 이상이어야 합니다');
      });

      it('최종 금액이 (총 금액 - 할인 금액)과 일치하지 않으면 ValidationException을 던진다 (BR-013)', () => {
        // when & then
        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            50000,
            5000,
            40000, // 올바른 값: 45000
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            50000,
            5000,
            40000,
            validOrderData.status,
            validOrderData.createdAt,
            validOrderData.paidAt,
            validOrderData.expiredAt,
            validOrderData.updatedAt,
          );
        }).toThrow('최종 금액이 올바르지 않습니다');
      });
    });

    describe('만료 시간 검증', () => {
      it('만료 시간이 생성 시간보다 이전이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            validOrderData.discountAmount,
            validOrderData.finalAmount,
            validOrderData.status,
            new Date('2025-01-01T10:00:00'),
            validOrderData.paidAt,
            new Date('2025-01-01T09:00:00'), // 생성 시간보다 이전
            validOrderData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            validOrderData.discountAmount,
            validOrderData.finalAmount,
            validOrderData.status,
            new Date('2025-01-01T10:00:00'),
            validOrderData.paidAt,
            new Date('2025-01-01T09:00:00'),
            validOrderData.updatedAt,
          );
        }).toThrow('만료 시간은 생성 시간보다 이후여야 합니다');
      });

      it('만료 시간이 생성 시간과 같으면 ValidationException을 던진다', () => {
        // given
        const sameTime = new Date('2025-01-01T10:00:00');

        // when & then
        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            validOrderData.discountAmount,
            validOrderData.finalAmount,
            validOrderData.status,
            sameTime,
            validOrderData.paidAt,
            sameTime,
            validOrderData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Order(
            validOrderData.id,
            validOrderData.userId,
            validOrderData.couponId,
            validOrderData.totalAmount,
            validOrderData.discountAmount,
            validOrderData.finalAmount,
            validOrderData.status,
            sameTime,
            validOrderData.paidAt,
            sameTime,
            validOrderData.updatedAt,
          );
        }).toThrow('만료 시간은 생성 시간보다 이후여야 합니다');
      });
    });
  });

  describe('create (정적 팩토리 메서드)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('쿠폰 없이 주문을 생성하고 만료 시간을 10분 후로 설정한다 (BR-005)', () => {
      // given
      const now = new Date('2025-06-01T10:00:00');
      jest.setSystemTime(now);

      // when
      const order = Order.create(1, 100, 50000);

      // then
      expect(order.id).toBe(1);
      expect(order.userId).toBe(100);
      expect(order.totalAmount).toBe(50000);
      expect(order.discountAmount).toBe(0);
      expect(order.finalAmount).toBe(50000);
      expect(order.couponId).toBe(null);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.createdAt).toEqual(now);
      expect(order.paidAt).toBe(null);
      expect(order.expiredAt).toEqual(new Date('2025-06-01T10:10:00')); // 10분 후
      expect(order.updatedAt).toEqual(now);
    });

    it('할인 금액을 지정하여 주문을 생성할 수 있다', () => {
      // given
      const now = new Date('2025-06-01T10:00:00');
      jest.setSystemTime(now);

      // when
      const order = Order.create(1, 100, 50000, 5000);

      // then
      expect(order.totalAmount).toBe(50000);
      expect(order.discountAmount).toBe(5000);
      expect(order.finalAmount).toBe(45000);
    });

    it('쿠폰 ID를 지정하여 주문을 생성할 수 있다', () => {
      // given
      const now = new Date('2025-06-01T10:00:00');
      jest.setSystemTime(now);

      // when
      const order = Order.create(1, 100, 50000, 5000, 999);

      // then
      expect(order.couponId).toBe(999);
      expect(order.discountAmount).toBe(5000);
    });
  });

  describe('createWithCoupon (정적 팩토리 메서드)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('유효한 쿠폰으로 주문을 생성하고 할인을 적용한다 (BR-009, BR-010, BR-012)', () => {
      // given
      jest.setSystemTime(new Date('2025-06-01'));
      const coupon = new Coupon(
        1,
        '10% 할인 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      // when
      const order = Order.createWithCoupon(1, 100, 50000, coupon);

      // then
      expect(order.totalAmount).toBe(50000);
      expect(order.discountAmount).toBe(5000); // 50000 * 0.1
      expect(order.finalAmount).toBe(45000);
      expect(order.couponId).toBe(1);
    });

    it('만료된 쿠폰은 DomainException(EXPIRED_COUPON)을 던진다', () => {
      // given
      jest.setSystemTime(new Date('2026-01-01'));
      const expiredCoupon = new Coupon(
        1,
        '만료된 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      // when & then
      expect(() =>
        Order.createWithCoupon(1, 100, 50000, expiredCoupon),
      ).toThrow(DomainException);

      try {
        Order.createWithCoupon(1, 100, 50000, expiredCoupon);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.EXPIRED_COUPON,
        );
      }
    });
  });

  describe('isExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('만료 시간 이전이면 false를 반환한다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        validOrderData.status,
        new Date('2025-01-01T10:00:00'),
        validOrderData.paidAt,
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when
      const result = order.isExpired();

      // then
      expect(result).toBe(false);
    });

    it('만료 시간 이후면 true를 반환한다 (BR-005, RF-012)', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:11:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        validOrderData.status,
        new Date('2025-01-01T10:00:00'),
        validOrderData.paidAt,
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when
      const result = order.isExpired();

      // then
      expect(result).toBe(true);
    });
  });

  describe('canPay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('PENDING 상태이고 만료되지 않았으면 true를 반환한다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        new Date('2025-01-01T10:00:00'),
        validOrderData.paidAt,
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when
      const result = order.canPay();

      // then
      expect(result).toBe(true);
    });

    it('PAID 상태이면 false를 반환한다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PAID,
        new Date('2025-01-01T10:00:00'),
        new Date('2025-01-01T10:05:00'),
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when
      const result = order.canPay();

      // then
      expect(result).toBe(false);
    });

    it('만료되었으면 false를 반환한다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:11:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        new Date('2025-01-01T10:00:00'),
        validOrderData.paidAt,
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when
      const result = order.canPay();

      // then
      expect(result).toBe(false);
    });
  });

  describe('pay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('결제 가능한 주문을 결제하고 상태를 PAID로 변경한다 (BR-014, RF-010)', () => {
      // given
      const createdAt = new Date('2025-01-01T10:00:00');
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        createdAt,
        null,
        new Date('2025-01-01T10:10:00'),
        createdAt,
      );

      const payTime = new Date('2025-01-01T10:05:30');
      jest.setSystemTime(payTime);

      // when
      order.pay();

      // then
      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.paidAt).toEqual(payTime);
      expect(order.updatedAt).toEqual(payTime);
    });

    it('이미 결제된 주문은 DomainException(ALREADY_PAID)을 던진다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PAID,
        new Date('2025-01-01T10:00:00'),
        new Date('2025-01-01T10:04:00'),
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when & then
      expect(() => order.pay()).toThrow(DomainException);

      try {
        order.pay();
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.ALREADY_PAID,
        );
      }
    });

    it('만료된 주문은 DomainException(ORDER_EXPIRED)을 던진다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:11:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        new Date('2025-01-01T10:00:00'),
        null,
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when & then
      expect(() => order.pay()).toThrow(DomainException);

      try {
        order.pay();
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.ORDER_EXPIRED,
        );
      }
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('대기 중인 주문을 취소하고 상태를 CANCELLED로 변경한다 (BR-014, RF-011)', () => {
      // given
      const createdAt = new Date('2025-01-01T10:00:00');
      jest.setSystemTime(createdAt);
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        createdAt,
        null,
        new Date('2025-01-01T10:10:00'),
        createdAt,
      );

      const cancelTime = new Date('2025-01-01T10:05:00');
      jest.setSystemTime(cancelTime);

      // when
      order.cancel();

      // then
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.updatedAt).toEqual(cancelTime);
    });

    it('PAID 상태의 주문은 ValidationException을 던진다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PAID,
        new Date('2025-01-01T10:00:00'),
        new Date('2025-01-01T10:04:00'),
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when & then
      expect(() => order.cancel()).toThrow(ValidationException);
      expect(() => order.cancel()).toThrow(
        '대기 중인 주문만 취소할 수 있습니다',
      );
    });
  });

  describe('expire', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('만료된 대기 중인 주문을 EXPIRED 상태로 변경한다 (BR-005, RF-012)', () => {
      // given
      const createdAt = new Date('2025-01-01T10:00:00');
      jest.setSystemTime(new Date('2025-01-01T10:11:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        createdAt,
        null,
        new Date('2025-01-01T10:10:00'),
        createdAt,
      );

      const expireTime = new Date('2025-01-01T10:11:00');
      jest.setSystemTime(expireTime);

      // when
      order.expire();

      // then
      expect(order.status).toBe(OrderStatus.EXPIRED);
      expect(order.updatedAt).toEqual(expireTime);
    });

    it('PAID 상태의 주문은 ValidationException을 던진다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:11:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PAID,
        new Date('2025-01-01T10:00:00'),
        new Date('2025-01-01T10:05:00'),
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when & then
      expect(() => order.expire()).toThrow(ValidationException);
      expect(() => order.expire()).toThrow(
        '대기 중인 주문만 만료시킬 수 있습니다',
      );
    });

    it('만료 시간이 지나지 않았으면 ValidationException을 던진다', () => {
      // given
      jest.setSystemTime(new Date('2025-01-01T10:05:00'));
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        OrderStatus.PENDING,
        new Date('2025-01-01T10:00:00'),
        null,
        new Date('2025-01-01T10:10:00'),
        validOrderData.updatedAt,
      );

      // when & then
      expect(() => order.expire()).toThrow(ValidationException);
      expect(() => order.expire()).toThrow('만료 시간이 지나지 않았습니다');
    });
  });

  describe('hasCoupon', () => {
    it('쿠폰 ID가 있으면 true를 반환한다', () => {
      // given
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        999,
        validOrderData.totalAmount,
        5000,
        45000,
        validOrderData.status,
        validOrderData.createdAt,
        validOrderData.paidAt,
        validOrderData.expiredAt,
        validOrderData.updatedAt,
      );

      // when
      const result = order.hasCoupon();

      // then
      expect(result).toBe(true);
    });

    it('쿠폰 ID가 null이면 false를 반환한다', () => {
      // given
      const order = new Order(
        validOrderData.id,
        validOrderData.userId,
        null,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        validOrderData.status,
        validOrderData.createdAt,
        validOrderData.paidAt,
        validOrderData.expiredAt,
        validOrderData.updatedAt,
      );

      // when
      const result = order.hasCoupon();

      // then
      expect(result).toBe(false);
    });
  });

  describe('isOwnedBy', () => {
    it('주문의 userId와 일치하면 true를 반환한다', () => {
      // given
      const order = new Order(
        validOrderData.id,
        100,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        validOrderData.status,
        validOrderData.createdAt,
        validOrderData.paidAt,
        validOrderData.expiredAt,
        validOrderData.updatedAt,
      );

      // when
      const result = order.isOwnedBy(100);

      // then
      expect(result).toBe(true);
    });

    it('주문의 userId와 일치하지 않으면 false를 반환한다', () => {
      // given
      const order = new Order(
        validOrderData.id,
        100,
        validOrderData.couponId,
        validOrderData.totalAmount,
        validOrderData.discountAmount,
        validOrderData.finalAmount,
        validOrderData.status,
        validOrderData.createdAt,
        validOrderData.paidAt,
        validOrderData.expiredAt,
        validOrderData.updatedAt,
      );

      // when
      const result = order.isOwnedBy(999);

      // then
      expect(result).toBe(false);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
