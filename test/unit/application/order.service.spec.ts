import { OrderService } from '@application/order.service';
import {
  IOrderRepository,
  IOrderItemRepository,
  IProductOptionRepository,
  IProductRepository,
  IUserRepository,
  IUserBalanceChangeLogRepository,
  ICouponRepository,
  IUserCouponRepository,
} from '@application/interfaces';
import { Order, OrderItem, OrderStatus } from '@domain/order';
import { Product, ProductOption } from '@domain/product';
import { User } from '@domain/user';
import { Coupon, UserCoupon } from '@domain/coupon';
import { ErrorCode } from '@domain/common/constants/error-code';
import { DomainException } from '@domain/common/exceptions';

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<IOrderRepository>;
  let mockOrderItemRepository: jest.Mocked<IOrderItemRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockProductOptionRepository: jest.Mocked<IProductOptionRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockBalanceLogRepository: jest.Mocked<IUserBalanceChangeLogRepository>;
  let mockCouponRepository: jest.Mocked<ICouponRepository>;
  let mockUserCouponRepository: jest.Mocked<IUserCouponRepository>;

  beforeEach(() => {
    jest.useFakeTimers();

    // Mock Repositories
    mockOrderRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      findExpiredPendingOrders: jest.fn(),
    } as any;

    mockOrderItemRepository = {
      findByOrderId: jest.fn(),
      save: jest.fn(),
      saveAll: jest.fn(),
      findRecentPaidOrderItems: jest.fn(),
    } as any;

    mockProductRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as any;

    mockProductOptionRepository = {
      findById: jest.fn(),
      findByProductId: jest.fn(),
      save: jest.fn(),
      saveAll: jest.fn(),
    } as any;

    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    mockBalanceLogRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
    } as any;

    mockCouponRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as any;

    mockUserCouponRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndCouponId: jest.fn(),
      save: jest.fn(),
    } as any;

    orderService = new OrderService(
      mockOrderRepository,
      mockOrderItemRepository,
      mockProductRepository,
      mockProductOptionRepository,
      mockUserRepository,
      mockBalanceLogRepository,
      mockCouponRepository,
      mockUserCouponRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const userId = 1;
    const productOptionId = 10;
    const quantity = 2;

    it('사용자가 존재하지 않으면 USER_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockUserRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(
        orderService.createOrder(userId, [{ productOptionId, quantity }]),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.createOrder(userId, [{ productOptionId, quantity }]);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.USER_NOT_FOUND,
        );
      }
    });

    it('상품 옵션이 존재하지 않으면 PRODUCT_OPTION_NOT_FOUND 예외를 던진다', async () => {
      // given
      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);
      mockProductOptionRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(
        orderService.createOrder(userId, [{ productOptionId, quantity }]),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.createOrder(userId, [{ productOptionId, quantity }]);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        );
      }
    });

    it('재고가 부족하면 INSUFFICIENT_STOCK 예외를 던진다 (BR-001)', async () => {
      // given
      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const productOption = new ProductOption(
        productOptionId,
        1,
        'Black',
        null,
        5, // 재고 5개
        0, // 선점 없음
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      // when & then: 10개 주문 시도 (재고 부족)
      await expect(
        orderService.createOrder(userId, [{ productOptionId, quantity: 10 }]),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.createOrder(userId, [
          { productOptionId, quantity: 10 },
        ]);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INSUFFICIENT_STOCK,
        );
      }
    });

    it('재고를 선점하고 주문서를 생성한다 (RF-008, BR-002)', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      jest.setSystemTime(now);

      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const productOption = new ProductOption(
        productOptionId,
        1,
        'Black',
        null,
        10, // 재고 10개
        0, // 선점 없음
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      const product = new Product(
        1,
        '테스트 상품',
        '상품 설명',
        5000,
        'ELECTRONICS',
        true,
        new Date(),
        new Date(),
      );
      mockProductRepository.findById.mockResolvedValue(product);

      const savedOrder = Order.create(100, userId, 10000);
      mockOrderRepository.save.mockResolvedValue(savedOrder);

      const orderItem = OrderItem.create(
        1,
        100,
        productOptionId,
        '테스트 상품',
        5000,
        quantity,
      );
      mockOrderItemRepository.saveAll.mockResolvedValue([orderItem]);

      // when
      const result = await orderService.createOrder(userId, [
        { productOptionId, quantity },
      ]);

      // then
      expect(result.orderId).toBe(100);
      expect(result.userId).toBe(userId);
      expect(result.totalAmount).toBe(10000);
      expect(result.status).toBe('PENDING');
      expect(productOption.reservedStock).toBe(2); // 재고 선점 확인
      expect(mockProductOptionRepository.save).toHaveBeenCalledWith(
        productOption,
      );
      expect(mockOrderRepository.save).toHaveBeenCalled();
      expect(mockOrderItemRepository.saveAll).toHaveBeenCalled();
    });

    it('여러 상품으로 주문서를 생성하고 총 금액을 계산한다', async () => {
      // given
      const user = new User(userId, 20000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const productOption1 = new ProductOption(
        10,
        1,
        'Black',
        null,
        10,
        0,
        new Date(),
        new Date(),
      );
      const productOption2 = new ProductOption(
        20,
        2,
        'White',
        null,
        5,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById
        .mockResolvedValueOnce(productOption1)
        .mockResolvedValueOnce(productOption2);

      const product1 = new Product(
        1,
        '상품1',
        '',
        5000,
        'ELECTRONICS',
        true,
        new Date(),
        new Date(),
      );
      const product2 = new Product(
        2,
        '상품2',
        '',
        3000,
        'FASHION',
        true,
        new Date(),
        new Date(),
      );
      mockProductRepository.findById
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      const savedOrder = Order.create(100, userId, 16000); // 5000*2 + 3000*2
      mockOrderRepository.save.mockResolvedValue(savedOrder);

      const orderItems = [
        OrderItem.create(1, 100, 10, '상품1', 5000, 2),
        OrderItem.create(2, 100, 20, '상품2', 3000, 2),
      ];
      mockOrderItemRepository.saveAll.mockResolvedValue(orderItems);

      // when
      const result = await orderService.createOrder(userId, [
        { productOptionId: 10, quantity: 2 },
        { productOptionId: 20, quantity: 2 },
      ]);

      // then
      expect(result.totalAmount).toBe(16000);
      expect(result.items).toHaveLength(2);
      expect(productOption1.reservedStock).toBe(2);
      expect(productOption2.reservedStock).toBe(2);
    });
  });

  describe('processPayment', () => {
    const userId = 1;
    const orderId = 100;

    it('주문이 존재하지 않으면 ORDER_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockOrderRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(
        orderService.processPayment(orderId, userId),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.processPayment(orderId, userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.ORDER_NOT_FOUND,
        );
      }
    });

    it('다른 사용자의 주문에 접근하면 UNAUTHORIZED_ORDER_ACCESS 예외를 던진다', async () => {
      // given
      const order = Order.create(orderId, 2, 10000); // userId: 2
      mockOrderRepository.findById.mockResolvedValue(order);

      // when & then
      await expect(
        orderService.processPayment(orderId, userId), // userId: 1
      ).rejects.toThrow(DomainException);

      try {
        await orderService.processPayment(orderId, userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.UNAUTHORIZED_ORDER_ACCESS,
        );
      }
    });

    it('이미 결제된 주문은 INVALID_ORDER_STATUS 예외를 던진다', async () => {
      // given
      const order = Order.create(orderId, userId, 10000);
      order.pay(); // 결제 처리
      mockOrderRepository.findById.mockResolvedValue(order);

      // when & then
      await expect(
        orderService.processPayment(orderId, userId),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.processPayment(orderId, userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INVALID_ORDER_STATUS,
        );
      }
    });

    it('잔액이 부족하면 INSUFFICIENT_BALANCE 예외를 던진다 (BR-011)', async () => {
      // given
      const order = Order.create(orderId, userId, 10000);
      mockOrderRepository.findById.mockResolvedValue(order);

      const user = new User(userId, 5000, new Date(), new Date()); // 잔액 5000
      mockUserRepository.findById.mockResolvedValue(user);

      // when & then: 10000원 결제 시도
      await expect(
        orderService.processPayment(orderId, userId),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.processPayment(orderId, userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INSUFFICIENT_BALANCE,
        );
      }
    });

    it('쿠폰 없이 결제를 처리하고 재고를 확정 차감한다 (RF-010, NFR-011)', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      jest.setSystemTime(now);

      const order = Order.create(orderId, userId, 10000);
      mockOrderRepository.findById.mockResolvedValue(order);

      const user = new User(userId, 15000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const orderItems = [OrderItem.create(1, orderId, 10, '상품1', 5000, 2)];
      mockOrderItemRepository.findByOrderId.mockResolvedValue(orderItems);

      const productOption = new ProductOption(
        10,
        1,
        'Black',
        null,
        10,
        2, // 선점 2개
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      const paidOrder = new Order(
        orderId,
        userId,
        null,
        10000,
        0,
        10000,
        OrderStatus.PAID,
        new Date(),
        now,
        new Date(now.getTime() + 10 * 60 * 1000),
        now,
      );
      mockOrderRepository.save.mockResolvedValue(paidOrder);

      // when
      const result = await orderService.processPayment(orderId, userId);

      // then
      expect(result.orderId).toBe(orderId);
      expect(result.status).toBe('PAID');
      expect(result.paidAmount).toBe(10000);
      expect(user.balance).toBe(5000); // 15000 - 10000
      expect(productOption.stock).toBe(8); // 10 - 2 (재고 확정 차감)
      expect(productOption.reservedStock).toBe(0); // 선점 해제
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
      expect(mockBalanceLogRepository.save).toHaveBeenCalled();
      expect(mockProductOptionRepository.save).toHaveBeenCalledWith(
        productOption,
      );
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('쿠폰을 적용하여 결제하고 쿠폰을 사용 처리한다 (RF-017, RF-018, BR-009)', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      jest.setSystemTime(now);

      const order = Order.create(orderId, userId, 10000);
      mockOrderRepository.findById.mockResolvedValue(order);

      const userCouponId = 1;
      const userCoupon = new UserCoupon(
        userCouponId,
        userId,
        10,
        null,
        new Date(),
        null,
        new Date('2025-12-31'),
        new Date(),
      );
      mockUserCouponRepository.findById.mockResolvedValue(userCoupon);

      const coupon = new Coupon(
        10,
        '10% 할인 쿠폰',
        10, // 10% 할인
        100,
        50,
        new Date('2025-12-31'),
        new Date(),
        new Date(),
      );
      mockCouponRepository.findById.mockResolvedValue(coupon);

      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const orderItems = [OrderItem.create(1, orderId, 10, '상품1', 10000, 1)];
      mockOrderItemRepository.findByOrderId.mockResolvedValue(orderItems);

      const productOption = new ProductOption(
        10,
        1,
        'Black',
        null,
        10,
        1,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      const paidOrder = new Order(
        orderId,
        userId,
        10,
        10000,
        1000, // 10% 할인
        9000, // 최종 금액
        OrderStatus.PAID,
        new Date(),
        now,
        new Date(now.getTime() + 10 * 60 * 1000),
        now,
      );
      mockOrderRepository.save.mockResolvedValue(paidOrder);

      // when
      const result = await orderService.processPayment(
        orderId,
        userId,
        userCouponId,
      );

      // then
      expect(result.paidAmount).toBe(9000); // 10000 - 1000 (할인)
      expect(user.balance).toBe(1000); // 10000 - 9000
      expect(userCoupon.usedAt).not.toBeNull(); // 쿠폰 사용 처리
      expect(mockUserCouponRepository.save).toHaveBeenCalledWith(userCoupon);
      expect(mockBalanceLogRepository.save).toHaveBeenCalled();
    });

    it('다른 사용자의 쿠폰을 사용하면 UNAUTHORIZED_ORDER_ACCESS 예외를 던진다', async () => {
      // given
      const order = Order.create(orderId, userId, 10000);
      mockOrderRepository.findById.mockResolvedValue(order);

      const userCouponId = 1;
      const userCoupon = new UserCoupon(
        userCouponId,
        2, // 다른 사용자
        10,
        null,
        new Date(),
        null,
        new Date('2025-12-31'),
        new Date(),
      );
      mockUserCouponRepository.findById.mockResolvedValue(userCoupon);

      const coupon = new Coupon(
        10,
        '쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date(),
        new Date(),
      );
      mockCouponRepository.findById.mockResolvedValue(coupon);

      // when & then
      await expect(
        orderService.processPayment(orderId, userId, userCouponId),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.processPayment(orderId, userId, userCouponId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.UNAUTHORIZED_ORDER_ACCESS,
        );
      }
    });

    it('만료된 쿠폰을 사용하면 EXPIRED_COUPON 예외를 던진다 (BR-007)', async () => {
      // given
      const now = new Date('2026-01-01'); // 쿠폰 만료 후
      jest.setSystemTime(now);

      const order = Order.create(orderId, userId, 10000);
      mockOrderRepository.findById.mockResolvedValue(order);

      const userCouponId = 1;
      const userCoupon = new UserCoupon(
        userCouponId,
        userId,
        10,
        null,
        new Date(),
        null,
        new Date('2025-12-31'), // 만료됨
        new Date(),
      );
      mockUserCouponRepository.findById.mockResolvedValue(userCoupon);

      const coupon = new Coupon(
        10,
        '만료된 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date(),
        new Date(),
      );
      mockCouponRepository.findById.mockResolvedValue(coupon);

      // when & then
      await expect(
        orderService.processPayment(orderId, userId, userCouponId),
      ).rejects.toThrow(DomainException);

      try {
        await orderService.processPayment(orderId, userId, userCouponId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.EXPIRED_COUPON,
        );
      }
    });
  });

  describe('getOrdersByUser', () => {
    const userId = 1;

    it('사용자의 모든 주문 내역을 조회한다 (RF-013)', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      const order1 = Order.create(100, userId, 10000);
      const order2 = new Order(
        101,
        userId,
        null,
        20000,
        0,
        20000,
        OrderStatus.PAID,
        now,
        now,
        new Date(now.getTime() + 10 * 60 * 1000), // 10분 후
        now,
      );
      mockOrderRepository.findByUserId.mockResolvedValue([order1, order2]);

      const orderItems1 = [OrderItem.create(1, 100, 10, '상품1', 10000, 1)];
      const orderItems2 = [OrderItem.create(2, 101, 20, '상품2', 20000, 1)];
      mockOrderItemRepository.findByOrderId
        .mockResolvedValueOnce(orderItems1)
        .mockResolvedValueOnce(orderItems2);

      const productOption1 = new ProductOption(
        10,
        1,
        'Black',
        null,
        10,
        0,
        new Date(),
        new Date(),
      );
      const productOption2 = new ProductOption(
        20,
        2,
        'White',
        null,
        5,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById
        .mockResolvedValueOnce(productOption1)
        .mockResolvedValueOnce(productOption2);

      // when
      const result = await orderService.getOrdersByUser(userId);

      // then
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].orderId).toBe(100);
      expect(result.orders[0].status).toBe('PENDING');
      expect(result.orders[1].orderId).toBe(101);
      expect(result.orders[1].status).toBe('PAID');
    });

    it('상태 필터로 주문을 조회할 수 있다', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      const order1 = Order.create(100, userId, 10000);
      const order2 = new Order(
        101,
        userId,
        null,
        20000,
        0,
        20000,
        OrderStatus.PAID,
        now,
        now,
        new Date(now.getTime() + 10 * 60 * 1000), // 10분 후
        now,
      );
      mockOrderRepository.findByUserId.mockResolvedValue([order1, order2]);

      const orderItems = [OrderItem.create(2, 101, 20, '상품2', 20000, 1)];
      mockOrderItemRepository.findByOrderId.mockResolvedValue(orderItems);

      const productOption = new ProductOption(
        20,
        2,
        'White',
        null,
        5,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById.mockResolvedValue(productOption);

      // when: PAID 상태만 조회
      const result = await orderService.getOrdersByUser(userId, 'PAID');

      // then
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderId).toBe(101);
      expect(result.orders[0].status).toBe('PAID');
    });

    it('주문이 없으면 빈 배열을 반환한다', async () => {
      // given
      mockOrderRepository.findByUserId.mockResolvedValue([]);

      // when
      const result = await orderService.getOrdersByUser(userId);

      // then
      expect(result.orders).toEqual([]);
    });
  });

  describe('getOrderDetail', () => {
    const orderId = 100;

    it('주문이 존재하지 않으면 ORDER_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockOrderRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(orderService.getOrderDetail(orderId)).rejects.toThrow(
        DomainException,
      );

      try {
        await orderService.getOrderDetail(orderId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.ORDER_NOT_FOUND,
        );
      }
    });

    it('주문 상세 정보를 조회한다', async () => {
      // given
      const order = Order.create(orderId, 1, 15000);
      mockOrderRepository.findById.mockResolvedValue(order);

      const orderItems = [
        OrderItem.create(1, orderId, 10, '상품1', 5000, 2),
        OrderItem.create(2, orderId, 20, '상품2', 2500, 2),
      ];
      mockOrderItemRepository.findByOrderId.mockResolvedValue(orderItems);

      const productOption1 = new ProductOption(
        10,
        1,
        'Black',
        null,
        10,
        0,
        new Date(),
        new Date(),
      );
      const productOption2 = new ProductOption(
        20,
        2,
        'White',
        null,
        5,
        0,
        new Date(),
        new Date(),
      );
      mockProductOptionRepository.findById
        .mockResolvedValueOnce(productOption1)
        .mockResolvedValueOnce(productOption2);

      // when
      const result = await orderService.getOrderDetail(orderId);

      // then
      expect(result.orderId).toBe(orderId);
      expect(result.userId).toBe(1);
      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(15000);
      expect(result.items[0].productId).toBe(1);
      expect(result.items[1].productId).toBe(2);
    });
  });
});
