import { OrderItem } from '@domain/order';
import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

describe('OrderItem Entity', () => {
  const validOrderItemData = {
    id: 1,
    orderId: 100,
    productOptionId: 200,
    productName: '테스트 상품',
    price: 10000,
    quantity: 2,
    subtotal: 20000,
    createdAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 OrderItem을 생성할 수 있다', () => {
      // when
      const orderItem = new OrderItem(
        validOrderItemData.id,
        validOrderItemData.orderId,
        validOrderItemData.productOptionId,
        validOrderItemData.productName,
        validOrderItemData.price,
        validOrderItemData.quantity,
        validOrderItemData.subtotal,
        validOrderItemData.createdAt,
      );

      // then
      expect(orderItem.id).toBe(validOrderItemData.id);
      expect(orderItem.orderId).toBe(validOrderItemData.orderId);
      expect(orderItem.productOptionId).toBe(
        validOrderItemData.productOptionId,
      );
      expect(orderItem.productName).toBe(validOrderItemData.productName);
      expect(orderItem.price).toBe(validOrderItemData.price);
      expect(orderItem.quantity).toBe(validOrderItemData.quantity);
      expect(orderItem.subtotal).toBe(validOrderItemData.subtotal);
      expect(orderItem.createdAt).toEqual(validOrderItemData.createdAt);
    });

    describe('가격 검증', () => {
      it('가격이 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            -1000,
            validOrderItemData.quantity,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            -1000,
            validOrderItemData.quantity,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        }).toThrow('가격은 0 이상이어야 합니다');
      });

      it('가격이 0이면 생성할 수 있다', () => {
        // when
        const orderItem = new OrderItem(
          validOrderItemData.id,
          validOrderItemData.orderId,
          validOrderItemData.productOptionId,
          validOrderItemData.productName,
          0,
          validOrderItemData.quantity,
          0,
          validOrderItemData.createdAt,
        );

        // then
        expect(orderItem.price).toBe(0);
        expect(orderItem.subtotal).toBe(0);
      });
    });

    describe('수량 검증', () => {
      it('수량이 0이면 DomainException(INVALID_QUANTITY)을 던진다', () => {
        // when & then
        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            0,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        }).toThrow(DomainException);

        try {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            0,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        } catch (error) {
          expect(error).toBeInstanceOf(DomainException);
          expect((error as DomainException).errorCode).toBe(
            ErrorCode.INVALID_QUANTITY,
          );
        }
      });

      it('수량이 음수이면 DomainException(INVALID_QUANTITY)을 던진다', () => {
        // when & then
        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            -1,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        }).toThrow(DomainException);

        try {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            -1,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        } catch (error) {
          expect(error).toBeInstanceOf(DomainException);
          expect((error as DomainException).errorCode).toBe(
            ErrorCode.INVALID_QUANTITY,
          );
        }
      });

      it('수량이 정수가 아니면 DomainException(INVALID_QUANTITY)을 던진다', () => {
        // when & then
        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            1.5,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        }).toThrow(DomainException);

        try {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            2.5,
            validOrderItemData.subtotal,
            validOrderItemData.createdAt,
          );
        } catch (error) {
          expect(error).toBeInstanceOf(DomainException);
          expect((error as DomainException).errorCode).toBe(
            ErrorCode.INVALID_QUANTITY,
          );
        }
      });
    });

    describe('소계 검증', () => {
      it('소계가 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            validOrderItemData.quantity,
            -1000,
            validOrderItemData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            validOrderItemData.price,
            validOrderItemData.quantity,
            -1000,
            validOrderItemData.createdAt,
          );
        }).toThrow('소계는 0 이상이어야 합니다');
      });

      it('소계가 (가격 × 수량)과 일치하지 않으면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            10000,
            2,
            15000, // 올바른 값: 20000
            validOrderItemData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new OrderItem(
            validOrderItemData.id,
            validOrderItemData.orderId,
            validOrderItemData.productOptionId,
            validOrderItemData.productName,
            10000,
            2,
            15000,
            validOrderItemData.createdAt,
          );
        }).toThrow('소계가 올바르지 않습니다');
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

    it('유효한 데이터로 OrderItem을 생성하고 소계를 자동 계산한다', () => {
      // given
      const now = new Date('2025-06-01');
      jest.setSystemTime(now);

      // when
      const orderItem = OrderItem.create(1, 100, 200, '테스트 상품', 10000, 3);

      // then
      expect(orderItem.id).toBe(1);
      expect(orderItem.orderId).toBe(100);
      expect(orderItem.productOptionId).toBe(200);
      expect(orderItem.productName).toBe('테스트 상품');
      expect(orderItem.price).toBe(10000);
      expect(orderItem.quantity).toBe(3);
      expect(orderItem.subtotal).toBe(30000); // 10000 * 3
      expect(orderItem.createdAt).toEqual(now);
    });

    it('가격이 0이면 소계도 0이다', () => {
      // given
      jest.setSystemTime(new Date('2025-06-01'));

      // when
      const orderItem = OrderItem.create(1, 100, 200, '무료 상품', 0, 5);

      // then
      expect(orderItem.price).toBe(0);
      expect(orderItem.quantity).toBe(5);
      expect(orderItem.subtotal).toBe(0);
    });

    it('수량이 1이면 소계는 가격과 같다', () => {
      // given
      jest.setSystemTime(new Date('2025-06-01'));

      // when
      const orderItem = OrderItem.create(1, 100, 200, '단일 상품', 25000, 1);

      // then
      expect(orderItem.price).toBe(25000);
      expect(orderItem.quantity).toBe(1);
      expect(orderItem.subtotal).toBe(25000);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
