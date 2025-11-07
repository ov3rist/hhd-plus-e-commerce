import { CartItem } from '@domain/cart';
import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

describe('CartItem Entity', () => {
  const validCartItemData = {
    id: 1,
    userId: 100,
    productOptionId: 200,
    quantity: 5,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 CartItem을 생성할 수 있다', () => {
      // when
      const cartItem = new CartItem(
        validCartItemData.id,
        validCartItemData.userId,
        validCartItemData.productOptionId,
        validCartItemData.quantity,
        validCartItemData.createdAt,
        validCartItemData.updatedAt,
      );

      // then
      expect(cartItem.id).toBe(validCartItemData.id);
      expect(cartItem.userId).toBe(validCartItemData.userId);
      expect(cartItem.productOptionId).toBe(validCartItemData.productOptionId);
      expect(cartItem.quantity).toBe(validCartItemData.quantity);
      expect(cartItem.createdAt).toEqual(validCartItemData.createdAt);
      expect(cartItem.updatedAt).toEqual(validCartItemData.updatedAt);
    });

    it('수량이 0이면 ValidationException을 던진다', () => {
      // when & then
      expect(() => {
        new CartItem(
          validCartItemData.id,
          validCartItemData.userId,
          validCartItemData.productOptionId,
          0,
          validCartItemData.createdAt,
          validCartItemData.updatedAt,
        );
      }).toThrow(ValidationException);

      expect(() => {
        new CartItem(
          validCartItemData.id,
          validCartItemData.userId,
          validCartItemData.productOptionId,
          0,
          validCartItemData.createdAt,
          validCartItemData.updatedAt,
        );
      }).toThrow('수량은 1 이상의 정수여야 합니다');
    });

    it('수량이 음수이면 ValidationException을 던진다', () => {
      // when & then
      expect(() => {
        new CartItem(
          validCartItemData.id,
          validCartItemData.userId,
          validCartItemData.productOptionId,
          -1,
          validCartItemData.createdAt,
          validCartItemData.updatedAt,
        );
      }).toThrow(ValidationException);

      expect(() => {
        new CartItem(
          validCartItemData.id,
          validCartItemData.userId,
          validCartItemData.productOptionId,
          -1,
          validCartItemData.createdAt,
          validCartItemData.updatedAt,
        );
      }).toThrow('수량은 1 이상의 정수여야 합니다');
    });

    it('수량이 정수가 아니면 ValidationException을 던진다', () => {
      // when & then
      expect(() => {
        new CartItem(
          validCartItemData.id,
          validCartItemData.userId,
          validCartItemData.productOptionId,
          1.5,
          validCartItemData.createdAt,
          validCartItemData.updatedAt,
        );
      }).toThrow(ValidationException);

      expect(() => {
        new CartItem(
          validCartItemData.id,
          validCartItemData.userId,
          validCartItemData.productOptionId,
          1.5,
          validCartItemData.createdAt,
          validCartItemData.updatedAt,
        );
      }).toThrow('수량은 1 이상의 정수여야 합니다');
    });
  });

  describe('updateQuantity', () => {
    let cartItem: CartItem;
    const originalUpdatedAt = new Date('2025-01-01');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(originalUpdatedAt);

      cartItem = new CartItem(
        validCartItemData.id,
        validCartItemData.userId,
        validCartItemData.productOptionId,
        validCartItemData.quantity,
        validCartItemData.createdAt,
        originalUpdatedAt,
      );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('유효한 수량으로 변경하고 updatedAt을 갱신한다', () => {
      // given
      const newQuantity = 10;
      const newTime = new Date('2025-01-02');
      jest.setSystemTime(newTime);

      // when
      cartItem.updateQuantity(newQuantity);

      // then
      expect(cartItem.quantity).toBe(newQuantity);
      expect(cartItem.updatedAt).toEqual(newTime);
      expect(cartItem.updatedAt).not.toEqual(originalUpdatedAt);
    });

    it('수량을 1로 변경할 수 있다 (경계값)', () => {
      // given
      const newQuantity = 1;

      // when
      cartItem.updateQuantity(newQuantity);

      // then
      expect(cartItem.quantity).toBe(newQuantity);
    });

    it('수량이 0이면 DomainException을 던지고 수량이 변경되지 않는다', () => {
      // given
      const originalQuantity = cartItem.quantity;

      // when & then
      expect(() => cartItem.updateQuantity(0)).toThrow(DomainException);

      try {
        cartItem.updateQuantity(0);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_QUANTITY,
        );
        expect(error.message).toBe(ErrorCode.INVALID_QUANTITY.message);
      }

      expect(cartItem.quantity).toBe(originalQuantity);
    });

    it('수량이 음수이면 DomainException을 던지고 수량이 변경되지 않는다', () => {
      // given
      const originalQuantity = cartItem.quantity;

      // when & then
      expect(() => cartItem.updateQuantity(-1)).toThrow(DomainException);

      try {
        cartItem.updateQuantity(-10);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_QUANTITY,
        );
      }

      expect(cartItem.quantity).toBe(originalQuantity);
    });

    it('수량이 정수가 아니면 DomainException을 던지고 수량이 변경되지 않는다', () => {
      // given
      const originalQuantity = cartItem.quantity;

      // when & then
      expect(() => cartItem.updateQuantity(1.5)).toThrow(DomainException);

      try {
        cartItem.updateQuantity(2.99);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_QUANTITY,
        );
      }

      expect(cartItem.quantity).toBe(originalQuantity);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
