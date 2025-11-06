import { ProductPrice } from '@domain/product';
import { ValidationException } from '@domain/common/exceptions';

describe('ProductPrice Value Object', () => {
  describe('생성', () => {
    it('유효한 가격으로 ProductPrice를 생성할 수 있다', () => {
      // when
      const price = ProductPrice.of(10000);

      // then
      expect(price.getValue()).toBe(10000);
    });

    it('가격이 0이면 생성할 수 있다', () => {
      // when
      const price = ProductPrice.of(0);

      // then
      expect(price.getValue()).toBe(0);
    });

    it('가격이 음수이면 ValidationException을 던진다', () => {
      // when & then
      expect(() => ProductPrice.of(-1000)).toThrow(ValidationException);
      expect(() => ProductPrice.of(-1000)).toThrow(
        '가격은 0 이상이어야 합니다',
      );
    });
  });

  describe('calculateDiscount', () => {
    it('할인 금액을 정확히 계산한다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when
      const discount = price.calculateDiscount(10);

      // then
      expect(discount).toBe(1000); // 10000 * 0.1
    });

    it('소숫점 첫 번째 자리에서 버림 처리한다 (BR-010)', () => {
      // given
      const price = ProductPrice.of(1000);

      // when
      const discount = price.calculateDiscount(15);

      // then
      expect(discount).toBe(150); // 1000 * 0.15 = 150.0
    });

    it('소숫점이 있을 때 버림 처리한다', () => {
      // given
      const price = ProductPrice.of(1234);

      // when
      const discount = price.calculateDiscount(10);

      // then
      expect(discount).toBe(123); // 1234 * 0.1 = 123.4 -> 123
    });

    it('할인율이 0이면 할인 금액도 0이다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when
      const discount = price.calculateDiscount(0);

      // then
      expect(discount).toBe(0);
    });

    it('할인율이 100이면 전체 금액이 할인된다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when
      const discount = price.calculateDiscount(100);

      // then
      expect(discount).toBe(10000);
    });

    it('할인율이 음수이면 ValidationException을 던진다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when & then
      expect(() => price.calculateDiscount(-10)).toThrow(ValidationException);
      expect(() => price.calculateDiscount(-10)).toThrow(
        '할인율은 0~100 사이여야 합니다',
      );
    });

    it('할인율이 100을 초과하면 ValidationException을 던진다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when & then
      expect(() => price.calculateDiscount(101)).toThrow(ValidationException);
      expect(() => price.calculateDiscount(101)).toThrow(
        '할인율은 0~100 사이여야 합니다',
      );
    });
  });

  describe('applyDiscount', () => {
    it('할인 후 최종 가격을 계산한다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when
      const finalPrice = price.applyDiscount(10);

      // then
      expect(finalPrice).toBe(9000); // 10000 - 1000
    });

    it('할인율이 0이면 원가를 반환한다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when
      const finalPrice = price.applyDiscount(0);

      // then
      expect(finalPrice).toBe(10000);
    });

    it('할인율이 100이면 0을 반환한다', () => {
      // given
      const price = ProductPrice.of(10000);

      // when
      const finalPrice = price.applyDiscount(100);

      // then
      expect(finalPrice).toBe(0);
    });

    it('소숫점 버림 후 최종 가격을 계산한다', () => {
      // given
      const price = ProductPrice.of(1234);

      // when
      const finalPrice = price.applyDiscount(10);

      // then
      expect(finalPrice).toBe(1111); // 1234 - 123
    });
  });
});
