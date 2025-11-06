import { ProductOption } from '@domain/product';
import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

describe('ProductOption Entity', () => {
  const validProductOptionData = {
    id: 1,
    productId: 100,
    color: 'Black',
    size: 'L',
    stock: 100,
    reservedStock: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 ProductOption을 생성할 수 있다', () => {
      // when
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        validProductOptionData.stock,
        validProductOptionData.reservedStock,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // then
      expect(option.id).toBe(validProductOptionData.id);
      expect(option.productId).toBe(validProductOptionData.productId);
      expect(option.color).toBe(validProductOptionData.color);
      expect(option.size).toBe(validProductOptionData.size);
      expect(option.stock).toBe(validProductOptionData.stock);
      expect(option.reservedStock).toBe(validProductOptionData.reservedStock);
      expect(option.createdAt).toEqual(validProductOptionData.createdAt);
      expect(option.updatedAt).toEqual(validProductOptionData.updatedAt);
    });

    it('color와 size가 null이어도 생성할 수 있다', () => {
      // when
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        null,
        null,
        validProductOptionData.stock,
        validProductOptionData.reservedStock,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // then
      expect(option.color).toBe(null);
      expect(option.size).toBe(null);
    });

    describe('재고 검증', () => {
      it('재고가 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new ProductOption(
            validProductOptionData.id,
            validProductOptionData.productId,
            validProductOptionData.color,
            validProductOptionData.size,
            -10,
            validProductOptionData.reservedStock,
            validProductOptionData.createdAt,
            validProductOptionData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new ProductOption(
            validProductOptionData.id,
            validProductOptionData.productId,
            validProductOptionData.color,
            validProductOptionData.size,
            -10,
            validProductOptionData.reservedStock,
            validProductOptionData.createdAt,
            validProductOptionData.updatedAt,
          );
        }).toThrow('재고는 0 이상이어야 합니다');
      });

      it('선점 재고가 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new ProductOption(
            validProductOptionData.id,
            validProductOptionData.productId,
            validProductOptionData.color,
            validProductOptionData.size,
            validProductOptionData.stock,
            -10,
            validProductOptionData.createdAt,
            validProductOptionData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new ProductOption(
            validProductOptionData.id,
            validProductOptionData.productId,
            validProductOptionData.color,
            validProductOptionData.size,
            validProductOptionData.stock,
            -10,
            validProductOptionData.createdAt,
            validProductOptionData.updatedAt,
          );
        }).toThrow('재고는 0 이상이어야 합니다');
      });

      it('선점 재고가 전체 재고를 초과하면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new ProductOption(
            validProductOptionData.id,
            validProductOptionData.productId,
            validProductOptionData.color,
            validProductOptionData.size,
            100,
            150,
            validProductOptionData.createdAt,
            validProductOptionData.updatedAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new ProductOption(
            validProductOptionData.id,
            validProductOptionData.productId,
            validProductOptionData.color,
            validProductOptionData.size,
            100,
            150,
            validProductOptionData.createdAt,
            validProductOptionData.updatedAt,
          );
        }).toThrow('선점 재고는 전체 재고를 초과할 수 없습니다');
      });

      it('재고와 선점 재고가 0이면 생성할 수 있다', () => {
        // when
        const option = new ProductOption(
          validProductOptionData.id,
          validProductOptionData.productId,
          validProductOptionData.color,
          validProductOptionData.size,
          0,
          0,
          validProductOptionData.createdAt,
          validProductOptionData.updatedAt,
        );

        // then
        expect(option.stock).toBe(0);
        expect(option.reservedStock).toBe(0);
      });
    });
  });

  describe('availableStock (getter)', () => {
    it('사용 가능한 재고를 계산한다 (BR-002)', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        30,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      const available = option.availableStock;

      // then
      expect(available).toBe(70); // 100 - 30
    });

    it('선점 재고가 0이면 사용 가능 재고는 전체 재고와 같다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        0,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      const available = option.availableStock;

      // then
      expect(available).toBe(100);
    });

    it('선점 재고가 전체 재고와 같으면 사용 가능 재고는 0이다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        100,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      const available = option.availableStock;

      // then
      expect(available).toBe(0);
    });
  });

  describe('reserveStock', () => {
    it('재고를 선점하고 선점 재고를 증가시킨다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        20,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      option.reserveStock(30);

      // then
      expect(option.reservedStock).toBe(50); // 20 + 30
      expect(option.stock).toBe(100); // 재고는 변경되지 않음
      expect(option.availableStock).toBe(50); // 100 - 50
    });

    it('수량이 0 이하이면 DomainException(INVALID_STOCK_QUANTITY)을 던진다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        0,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when & then
      expect(() => option.reserveStock(0)).toThrow(DomainException);
      expect(() => option.reserveStock(-10)).toThrow(DomainException);

      try {
        option.reserveStock(0);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_STOCK_QUANTITY,
        );
      }
    });

    it('사용 가능 재고보다 많은 수량을 선점하려면 DomainException(INSUFFICIENT_STOCK)을 던진다 (BR-002)', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        50,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when & then
      expect(() => option.reserveStock(51)).toThrow(DomainException);

      try {
        option.reserveStock(51);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INSUFFICIENT_STOCK,
        );
      }
    });
  });

  describe('decreaseStock', () => {
    it('재고와 선점 재고를 함께 차감한다 (BR-003)', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        50,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      option.decreaseStock(30);

      // then
      expect(option.stock).toBe(70); // 100 - 30
      expect(option.reservedStock).toBe(20); // 50 - 30
      expect(option.availableStock).toBe(50); // 70 - 20
    });

    it('수량이 0 이하이면 DomainException(INVALID_STOCK_QUANTITY)을 던진다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        50,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when & then
      expect(() => option.decreaseStock(0)).toThrow(DomainException);
      expect(() => option.decreaseStock(-10)).toThrow(DomainException);

      try {
        option.decreaseStock(0);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_STOCK_QUANTITY,
        );
      }
    });

    it('선점 재고보다 많은 수량을 차감하려면 ValidationException을 던진다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        30,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when & then
      expect(() => option.decreaseStock(31)).toThrow(ValidationException);
      expect(() => option.decreaseStock(31)).toThrow(
        '선점된 재고가 부족합니다',
      );
    });
  });

  describe('releaseReservedStock', () => {
    it('선점 재고를 해제한다 (BR-004)', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        50,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      option.releaseReservedStock(30);

      // then
      expect(option.reservedStock).toBe(20); // 50 - 30
      expect(option.stock).toBe(100); // 재고는 변경되지 않음
      expect(option.availableStock).toBe(80); // 100 - 20
    });

    it('수량이 0 이하이면 DomainException(INVALID_STOCK_QUANTITY)을 던진다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        50,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when & then
      expect(() => option.releaseReservedStock(0)).toThrow(DomainException);
      expect(() => option.releaseReservedStock(-10)).toThrow(DomainException);

      try {
        option.releaseReservedStock(0);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_STOCK_QUANTITY,
        );
      }
    });

    it('선점 재고보다 많은 수량을 해제하려면 ValidationException을 던진다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        30,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when & then
      expect(() => option.releaseReservedStock(31)).toThrow(
        ValidationException,
      );
      expect(() => option.releaseReservedStock(31)).toThrow(
        '해제할 선점 재고가 부족합니다',
      );
    });
  });

  describe('canBeOrdered', () => {
    it('사용 가능 재고가 있으면 true를 반환한다 (BR-001)', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        50,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      const result = option.canBeOrdered();

      // then
      expect(result).toBe(true);
    });

    it('사용 가능 재고가 0이면 false를 반환한다 (BR-001)', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        100,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      const result = option.canBeOrdered();

      // then
      expect(result).toBe(false);
    });

    it('전체 재고가 0이면 false를 반환한다', () => {
      // given
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        0,
        0,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when
      const result = option.canBeOrdered();

      // then
      expect(result).toBe(false);
    });
  });

  describe('재고 흐름 시나리오', () => {
    it('주문 생성 → 결제 완료 시나리오', () => {
      // given: 초기 재고 100개
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        0,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when: 주문서 생성 시 재고 선점 (30개)
      option.reserveStock(30);

      // then: 선점 재고 증가, 전체 재고는 그대로
      expect(option.stock).toBe(100);
      expect(option.reservedStock).toBe(30);
      expect(option.availableStock).toBe(70);

      // when: 결제 완료 시 재고 확정 차감
      option.decreaseStock(30);

      // then: 전체 재고와 선점 재고 모두 감소
      expect(option.stock).toBe(70);
      expect(option.reservedStock).toBe(0);
      expect(option.availableStock).toBe(70);
    });

    it('주문 생성 → 결제 실패/만료 시나리오', () => {
      // given: 초기 재고 100개
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        0,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when: 주문서 생성 시 재고 선점 (30개)
      option.reserveStock(30);

      // then: 선점 재고 증가
      expect(option.stock).toBe(100);
      expect(option.reservedStock).toBe(30);
      expect(option.availableStock).toBe(70);

      // when: 결제 실패 시 선점 재고 해제
      option.releaseReservedStock(30);

      // then: 선점 재고만 감소, 전체 재고는 원상복구
      expect(option.stock).toBe(100);
      expect(option.reservedStock).toBe(0);
      expect(option.availableStock).toBe(100);
    });

    it('여러 주문이 동시에 진행되는 시나리오', () => {
      // given: 초기 재고 100개
      const option = new ProductOption(
        validProductOptionData.id,
        validProductOptionData.productId,
        validProductOptionData.color,
        validProductOptionData.size,
        100,
        0,
        validProductOptionData.createdAt,
        validProductOptionData.updatedAt,
      );

      // when: 주문 A, B, C가 각각 20개씩 선점
      option.reserveStock(20); // 주문 A
      option.reserveStock(20); // 주문 B
      option.reserveStock(20); // 주문 C

      // then: 선점 재고 60개
      expect(option.reservedStock).toBe(60);
      expect(option.availableStock).toBe(40);

      // when: 주문 A 결제 완료
      option.decreaseStock(20);

      // then
      expect(option.stock).toBe(80);
      expect(option.reservedStock).toBe(40);
      expect(option.availableStock).toBe(40);

      // when: 주문 B 결제 실패 (선점 해제)
      option.releaseReservedStock(20);

      // then
      expect(option.stock).toBe(80);
      expect(option.reservedStock).toBe(20);
      expect(option.availableStock).toBe(60);

      // when: 주문 C 결제 완료
      option.decreaseStock(20);

      // then
      expect(option.stock).toBe(60);
      expect(option.reservedStock).toBe(0);
      expect(option.availableStock).toBe(60);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
