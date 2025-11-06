import { CartService } from '@application/cart.service';
import {
  ICartRepository,
  IProductRepository,
  IProductOptionRepository,
} from '@application/interfaces';
import { CartItem } from '@domain/cart';
import { Product, ProductOption } from '@domain/product';
import { ErrorCode } from '@domain/common/constants/error-code';
import { DomainException } from '@domain/common/exceptions';

describe('CartService', () => {
  let cartService: CartService;
  let mockCartRepository: jest.Mocked<ICartRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockProductOptionRepository: jest.Mocked<IProductOptionRepository>;

  beforeEach(() => {
    // Mock Repository 생성
    mockCartRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndProductOptionId: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn(),
    } as any;

    mockProductRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      findTopProducts: jest.fn(),
    } as any;

    mockProductOptionRepository = {
      findById: jest.fn(),
      findByProductId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
    } as any;

    cartService = new CartService(
      mockCartRepository,
      mockProductRepository,
      mockProductOptionRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart', () => {
    const userId = 1;
    const productOptionId = 10;
    const quantity = 2;

    it('상품 옵션이 존재하지 않으면 PRODUCT_OPTION_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockProductOptionRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(
        cartService.addToCart(userId, productOptionId, quantity),
      ).rejects.toThrow(DomainException);

      try {
        await cartService.addToCart(userId, productOptionId, quantity);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        );
      }

      expect(mockProductOptionRepository.findById).toHaveBeenCalledWith(
        productOptionId,
      );
      expect(
        mockCartRepository.findByUserIdAndProductOptionId,
      ).not.toHaveBeenCalled();
    });

    it('재고가 부족하면 INSUFFICIENT_STOCK 예외를 던진다', async () => {
      // given
      const productOption = new ProductOption(
        productOptionId,
        100,
        'Black',
        'L',
        5, // 전체 재고 5
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      // when & then: 재고 5개인데 10개 요청
      await expect(
        cartService.addToCart(userId, productOptionId, 10),
      ).rejects.toThrow(DomainException);

      try {
        await cartService.addToCart(userId, productOptionId, 10);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INSUFFICIENT_STOCK,
        );
      }

      expect(
        mockCartRepository.findByUserIdAndProductOptionId,
      ).not.toHaveBeenCalled();
    });

    it('새로운 상품을 장바구니에 추가한다', async () => {
      // given
      const productOption = new ProductOption(
        productOptionId,
        100,
        'Black',
        'L',
        100,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);
      mockCartRepository.findByUserIdAndProductOptionId.mockResolvedValue(null); // 기존 항목 없음

      const savedCartItem = new CartItem(
        1,
        userId,
        productOptionId,
        quantity,
        new Date(),
        new Date(),
      );
      mockCartRepository.save.mockResolvedValue(savedCartItem);

      // when
      const result = await cartService.addToCart(
        userId,
        productOptionId,
        quantity,
      );

      // then
      expect(result).toEqual({
        cartItemId: 1,
        productOptionId,
        quantity,
      });
      expect(mockProductOptionRepository.findById).toHaveBeenCalledWith(
        productOptionId,
      );
      expect(
        mockCartRepository.findByUserIdAndProductOptionId,
      ).toHaveBeenCalledWith(userId, productOptionId);
      expect(mockCartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          productOptionId,
          quantity,
        }),
      );
    });

    it('기존 장바구니 항목이 있으면 수량을 증가시킨다', async () => {
      // given
      const productOption = new ProductOption(
        productOptionId,
        100,
        'Black',
        'L',
        100,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      const existingCartItem = new CartItem(
        1,
        userId,
        productOptionId,
        3, // 기존 수량 3
        new Date(),
        new Date(),
      );
      mockCartRepository.findByUserIdAndProductOptionId.mockResolvedValue(
        existingCartItem,
      );

      const updatedCartItem = new CartItem(
        1,
        userId,
        productOptionId,
        5, // 3 + 2 = 5
        new Date(),
        new Date(),
      );
      mockCartRepository.save.mockResolvedValue(updatedCartItem);

      // when
      const result = await cartService.addToCart(
        userId,
        productOptionId,
        quantity,
      );

      // then
      expect(result).toEqual({
        cartItemId: 1,
        productOptionId,
        quantity: 5,
      });
      expect(existingCartItem.quantity).toBe(5); // 수량 증가 확인
      expect(mockCartRepository.save).toHaveBeenCalledWith(existingCartItem);
    });
  });

  describe('getCart', () => {
    const userId = 1;

    it('빈 장바구니를 조회하면 빈 배열과 총액 0을 반환한다', async () => {
      // given
      mockCartRepository.findByUserId.mockResolvedValue([]);

      // when
      const result = await cartService.getCart(userId);

      // then
      expect(result).toEqual({
        items: [],
        totalAmount: 0,
      });
      expect(mockCartRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('장바구니 항목들을 조회하고 총액을 계산한다', async () => {
      // given
      const cartItem1 = new CartItem(1, userId, 10, 2, new Date(), new Date());
      const cartItem2 = new CartItem(2, userId, 20, 3, new Date(), new Date());
      mockCartRepository.findByUserId.mockResolvedValue([cartItem1, cartItem2]);

      const product1 = new Product(
        100,
        '상품1',
        '설명1',
        10000, // 가격 10000
        '카테고리1',
        true,
        new Date(),
        new Date(),
      );
      const product2 = new Product(
        200,
        '상품2',
        '설명2',
        5000, // 가격 5000
        '카테고리2',
        true,
        new Date(),
        new Date(),
      );

      const productOption1 = new ProductOption(
        10,
        100,
        'Black',
        'L',
        100,
        0,
        new Date(),
        new Date(),
      );
      const productOption2 = new ProductOption(
        20,
        200,
        'White',
        'M',
        50,
        0,
        new Date(),
        new Date(),
      );

      mockProductOptionRepository.findById
        .mockResolvedValueOnce(productOption1)
        .mockResolvedValueOnce(productOption2);

      mockProductRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      // when
      const result = await cartService.getCart(userId);

      // then
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        cartItemId: 1,
        productId: 100,
        productName: '상품1',
        productOptionId: 10,
        optionColor: 'Black',
        optionSize: 'L',
        price: 10000,
        quantity: 2,
        subtotal: 20000, // 10000 * 2
      });
      expect(result.items[1]).toEqual({
        cartItemId: 2,
        productId: 200,
        productName: '상품2',
        productOptionId: 20,
        optionColor: 'White',
        optionSize: 'M',
        price: 5000,
        quantity: 3,
        subtotal: 15000, // 5000 * 3
      });
      expect(result.totalAmount).toBe(35000); // 20000 + 15000
    });

    it('상품 옵션을 찾을 수 없으면 PRODUCT_OPTION_NOT_FOUND 예외를 던진다', async () => {
      // given
      const cartItem = new CartItem(1, userId, 10, 2, new Date(), new Date());
      mockCartRepository.findByUserId.mockResolvedValue([cartItem]);
      mockProductOptionRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(cartService.getCart(userId)).rejects.toThrow(
        DomainException,
      );

      try {
        await cartService.getCart(userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        );
      }
    });

    it('상품을 찾을 수 없으면 PRODUCT_NOT_FOUND 예외를 던진다', async () => {
      // given
      const cartItem = new CartItem(1, userId, 10, 2, new Date(), new Date());
      mockCartRepository.findByUserId.mockResolvedValue([cartItem]);

      const productOption = new ProductOption(
        10,
        100,
        'Black',
        'L',
        100,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);
      mockProductRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(cartService.getCart(userId)).rejects.toThrow(
        DomainException,
      );

      try {
        await cartService.getCart(userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.PRODUCT_NOT_FOUND,
        );
      }
    });
  });

  describe('removeFromCart', () => {
    const userId = 1;
    const cartItemId = 10;

    it('장바구니 항목을 삭제한다', async () => {
      // given
      const cartItem = new CartItem(
        cartItemId,
        userId,
        100,
        2,
        new Date(),
        new Date(),
      );
      mockCartRepository.findById.mockResolvedValue(cartItem);
      mockCartRepository.deleteById.mockResolvedValue(undefined);

      // when
      await cartService.removeFromCart(userId, cartItemId);

      // then
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartItemId);
      expect(mockCartRepository.deleteById).toHaveBeenCalledWith(cartItemId);
    });

    it('장바구니 항목이 존재하지 않으면 CART_ITEM_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockCartRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(
        cartService.removeFromCart(userId, cartItemId),
      ).rejects.toThrow(DomainException);

      try {
        await cartService.removeFromCart(userId, cartItemId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.CART_ITEM_NOT_FOUND,
        );
      }

      expect(mockCartRepository.deleteById).not.toHaveBeenCalled();
    });

    it('다른 사용자의 장바구니 항목을 삭제하려 하면 UNAUTHORIZED_CART_ACCESS 예외를 던진다', async () => {
      // given
      const cartItem = new CartItem(
        cartItemId,
        999, // 다른 사용자
        100,
        2,
        new Date(),
        new Date(),
      );
      mockCartRepository.findById.mockResolvedValue(cartItem);

      // when & then
      await expect(
        cartService.removeFromCart(userId, cartItemId),
      ).rejects.toThrow(DomainException);

      try {
        await cartService.removeFromCart(userId, cartItemId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.UNAUTHORIZED_CART_ACCESS,
        );
      }

      expect(mockCartRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
