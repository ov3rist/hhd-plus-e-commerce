import { Product } from '@domain/product';
import { ValidationException } from '@domain/common/exceptions';

describe('Product Entity', () => {
  const validProductData = {
    id: 1,
    name: '테스트 상품',
    description: '테스트 상품 설명',
    price: 10000,
    category: '전자제품',
    isAvailable: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 Product를 생성할 수 있다', () => {
      // when
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        validProductData.isAvailable,
        validProductData.createdAt,
        validProductData.updatedAt,
      );

      // then
      expect(product.id).toBe(validProductData.id);
      expect(product.name).toBe(validProductData.name);
      expect(product.description).toBe(validProductData.description);
      expect(product.price).toBe(validProductData.price);
      expect(product.category).toBe(validProductData.category);
      expect(product.isAvailable).toBe(validProductData.isAvailable);
      expect(product.createdAt).toEqual(validProductData.createdAt);
      expect(product.updatedAt).toEqual(validProductData.updatedAt);
    });

    describe('가격 검증', () => {
      it('가격이 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new Product(
            validProductData.id,
            validProductData.name,
            validProductData.description,
            -1000,
            validProductData.category,
            validProductData.isAvailable,
            validProductData.createdAt,
            validProductData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new Product(
            validProductData.id,
            validProductData.name,
            validProductData.description,
            -1000,
            validProductData.category,
            validProductData.isAvailable,
            validProductData.createdAt,
            validProductData.updatedAt,
          );
        }).toThrow('가격은 0 이상이어야 합니다');
      });

      it('가격이 0이면 생성할 수 있다', () => {
        // when
        const product = new Product(
          validProductData.id,
          validProductData.name,
          validProductData.description,
          0,
          validProductData.category,
          validProductData.isAvailable,
          validProductData.createdAt,
          validProductData.updatedAt,
        );

        // then
        expect(product.price).toBe(0);
      });
    });
  });

  describe('canBeSold', () => {
    it('판매 가능 상태이면 true를 반환한다', () => {
      // given
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        true,
        validProductData.createdAt,
        validProductData.updatedAt,
      );

      // when
      const result = product.canBeSold();

      // then
      expect(result).toBe(true);
    });

    it('판매 불가 상태이면 false를 반환한다', () => {
      // given
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        false,
        validProductData.createdAt,
        validProductData.updatedAt,
      );

      // when
      const result = product.canBeSold();

      // then
      expect(result).toBe(false);
    });
  });

  describe('markAsUnavailable', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('상품을 판매 불가 상태로 변경하고 updatedAt을 갱신한다', () => {
      // given
      const originalUpdatedAt = new Date('2025-01-01');
      jest.setSystemTime(originalUpdatedAt);
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        true,
        validProductData.createdAt,
        originalUpdatedAt,
      );

      const newTime = new Date('2025-01-02');
      jest.setSystemTime(newTime);

      // when
      product.markAsUnavailable();

      // then
      expect(product.isAvailable).toBe(false);
      expect(product.updatedAt).toEqual(newTime);
      expect(product.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe('markAsAvailable', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('상품을 판매 가능 상태로 변경하고 updatedAt을 갱신한다', () => {
      // given
      const originalUpdatedAt = new Date('2025-01-01');
      jest.setSystemTime(originalUpdatedAt);
      const product = new Product(
        validProductData.id,
        validProductData.name,
        validProductData.description,
        validProductData.price,
        validProductData.category,
        false,
        validProductData.createdAt,
        originalUpdatedAt,
      );

      const newTime = new Date('2025-01-02');
      jest.setSystemTime(newTime);

      // when
      product.markAsAvailable();

      // then
      expect(product.isAvailable).toBe(true);
      expect(product.updatedAt).toEqual(newTime);
      expect(product.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
