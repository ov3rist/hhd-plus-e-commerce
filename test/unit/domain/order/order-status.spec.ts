import { OrderStatus } from '@domain/order';
import { ValidationException } from '@domain/common/exceptions';

describe('OrderStatus Value Object', () => {
  describe('생성 및 검증', () => {
    it('유효한 상태로 OrderStatus를 생성할 수 있다', () => {
      // when & then
      expect(OrderStatus.PENDING.value).toBe('PENDING');
      expect(OrderStatus.PAID.value).toBe('PAID');
      expect(OrderStatus.CANCELLED.value).toBe('CANCELLED');
      expect(OrderStatus.EXPIRED.value).toBe('EXPIRED');
    });

    it('from 메서드로 문자열에서 OrderStatus를 생성할 수 있다', () => {
      // when
      const pending = OrderStatus.from('PENDING');
      const paid = OrderStatus.from('PAID');
      const cancelled = OrderStatus.from('CANCELLED');
      const expired = OrderStatus.from('EXPIRED');

      // then
      expect(pending).toBe(OrderStatus.PENDING);
      expect(paid).toBe(OrderStatus.PAID);
      expect(cancelled).toBe(OrderStatus.CANCELLED);
      expect(expired).toBe(OrderStatus.EXPIRED);
    });

    it('from 메서드는 대소문자를 구분하지 않는다', () => {
      // when
      const pending = OrderStatus.from('pending');
      const paid = OrderStatus.from('Paid');
      const cancelled = OrderStatus.from('CANCELLED');

      // then
      expect(pending).toBe(OrderStatus.PENDING);
      expect(paid).toBe(OrderStatus.PAID);
      expect(cancelled).toBe(OrderStatus.CANCELLED);
    });

    it('유효하지 않은 상태는 ValidationException을 던진다', () => {
      // when & then
      expect(() => OrderStatus.from('INVALID')).toThrow(ValidationException);
      expect(() => OrderStatus.from('INVALID')).toThrow(
        '유효하지 않은 주문 상태: INVALID',
      );
    });
  });

  describe('상태 확인 메서드', () => {
    it('isPending은 PENDING 상태일 때만 true를 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.isPending()).toBe(true);
      expect(OrderStatus.PAID.isPending()).toBe(false);
      expect(OrderStatus.CANCELLED.isPending()).toBe(false);
      expect(OrderStatus.EXPIRED.isPending()).toBe(false);
    });

    it('isPaid는 PAID 상태일 때만 true를 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.isPaid()).toBe(false);
      expect(OrderStatus.PAID.isPaid()).toBe(true);
      expect(OrderStatus.CANCELLED.isPaid()).toBe(false);
      expect(OrderStatus.EXPIRED.isPaid()).toBe(false);
    });

    it('isCancelled는 CANCELLED 상태일 때만 true를 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.isCancelled()).toBe(false);
      expect(OrderStatus.PAID.isCancelled()).toBe(false);
      expect(OrderStatus.CANCELLED.isCancelled()).toBe(true);
      expect(OrderStatus.EXPIRED.isCancelled()).toBe(false);
    });

    it('isExpired는 EXPIRED 상태일 때만 true를 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.isExpired()).toBe(false);
      expect(OrderStatus.PAID.isExpired()).toBe(false);
      expect(OrderStatus.CANCELLED.isExpired()).toBe(false);
      expect(OrderStatus.EXPIRED.isExpired()).toBe(true);
    });
  });

  describe('canTransitionTo (상태 전이 검증)', () => {
    it('PENDING은 PAID로 전이할 수 있다', () => {
      // when
      const canTransition = OrderStatus.PENDING.canTransitionTo(
        OrderStatus.PAID,
      );

      // then
      expect(canTransition).toBe(true);
    });

    it('PENDING은 CANCELLED로 전이할 수 있다', () => {
      // when
      const canTransition = OrderStatus.PENDING.canTransitionTo(
        OrderStatus.CANCELLED,
      );

      // then
      expect(canTransition).toBe(true);
    });

    it('PENDING은 EXPIRED로 전이할 수 있다', () => {
      // when
      const canTransition = OrderStatus.PENDING.canTransitionTo(
        OrderStatus.EXPIRED,
      );

      // then
      expect(canTransition).toBe(true);
    });

    it('PENDING은 PENDING으로 전이할 수 없다', () => {
      // when
      const canTransition = OrderStatus.PENDING.canTransitionTo(
        OrderStatus.PENDING,
      );

      // then
      expect(canTransition).toBe(false);
    });

    it('PAID는 어떤 상태로도 전이할 수 없다', () => {
      // when & then
      expect(OrderStatus.PAID.canTransitionTo(OrderStatus.PENDING)).toBe(false);
      expect(OrderStatus.PAID.canTransitionTo(OrderStatus.PAID)).toBe(false);
      expect(OrderStatus.PAID.canTransitionTo(OrderStatus.CANCELLED)).toBe(
        false,
      );
      expect(OrderStatus.PAID.canTransitionTo(OrderStatus.EXPIRED)).toBe(false);
    });

    it('CANCELLED는 어떤 상태로도 전이할 수 없다', () => {
      // when & then
      expect(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.PENDING)).toBe(
        false,
      );
      expect(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.PAID)).toBe(
        false,
      );
      expect(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.CANCELLED)).toBe(
        false,
      );
      expect(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.EXPIRED)).toBe(
        false,
      );
    });

    it('EXPIRED는 어떤 상태로도 전이할 수 없다', () => {
      // when & then
      expect(OrderStatus.EXPIRED.canTransitionTo(OrderStatus.PENDING)).toBe(
        false,
      );
      expect(OrderStatus.EXPIRED.canTransitionTo(OrderStatus.PAID)).toBe(false);
      expect(OrderStatus.EXPIRED.canTransitionTo(OrderStatus.CANCELLED)).toBe(
        false,
      );
      expect(OrderStatus.EXPIRED.canTransitionTo(OrderStatus.EXPIRED)).toBe(
        false,
      );
    });
  });

  describe('equals', () => {
    it('같은 상태는 true를 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.equals(OrderStatus.PENDING)).toBe(true);
      expect(OrderStatus.PAID.equals(OrderStatus.PAID)).toBe(true);
      expect(OrderStatus.CANCELLED.equals(OrderStatus.CANCELLED)).toBe(true);
      expect(OrderStatus.EXPIRED.equals(OrderStatus.EXPIRED)).toBe(true);
    });

    it('다른 상태는 false를 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.equals(OrderStatus.PAID)).toBe(false);
      expect(OrderStatus.PAID.equals(OrderStatus.CANCELLED)).toBe(false);
      expect(OrderStatus.CANCELLED.equals(OrderStatus.EXPIRED)).toBe(false);
      expect(OrderStatus.EXPIRED.equals(OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('toString', () => {
    it('상태 값을 문자열로 반환한다', () => {
      // when & then
      expect(OrderStatus.PENDING.toString()).toBe('PENDING');
      expect(OrderStatus.PAID.toString()).toBe('PAID');
      expect(OrderStatus.CANCELLED.toString()).toBe('CANCELLED');
      expect(OrderStatus.EXPIRED.toString()).toBe('EXPIRED');
    });
  });
});
