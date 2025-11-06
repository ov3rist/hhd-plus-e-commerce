import { OrderService } from '@application/order.service';
import { UserService } from '@application/user.service';
import {
  OrderRepository,
  OrderItemRepository,
  ProductRepository,
  ProductOptionRepository,
  UserRepository,
  UserBalanceChangeLogRepository,
  CouponRepository,
  UserCouponRepository,
} from '@infrastructure/repositories';
import { Product } from '@domain/product/product.entity';
import { ProductOption } from '@domain/product/product-option.entity';
import { User } from '@domain/user/user.entity';

describe('동시성 제어 통합 테스트', () => {
  let orderService: OrderService;
  let userService: UserService;
  let productRepository: ProductRepository;
  let productOptionRepository: ProductOptionRepository;
  let userRepository: UserRepository;

  beforeEach(() => {
    const orderRepository = new OrderRepository();
    const orderItemRepository = new OrderItemRepository(orderRepository);
    productRepository = new ProductRepository();
    productOptionRepository = new ProductOptionRepository();
    userRepository = new UserRepository();
    const balanceLogRepository = new UserBalanceChangeLogRepository();
    const couponRepository = new CouponRepository();
    const userCouponRepository = new UserCouponRepository();

    orderService = new OrderService(
      orderRepository,
      orderItemRepository,
      productRepository,
      productOptionRepository,
      userRepository,
      balanceLogRepository,
      couponRepository,
      userCouponRepository,
    );

    userService = new UserService(userRepository, balanceLogRepository);
  });

  describe('product-option.stock 동시성', () => {
    it('동시에 20명이 같은 상품 주문 시 재고가 정확히 차감된다', async () => {
      // Given: 재고 100개
      const product = await productRepository.save(
        new Product(
          0,
          '상품',
          '설명',
          10000,
          '의류',
          true,
          new Date(),
          new Date(),
        ),
      );

      const productOption = await productOptionRepository.save(
        new ProductOption(
          0,
          product.id,
          'RED',
          'M',
          100,
          0,
          new Date(),
          new Date(),
        ),
      );

      const users = await Promise.all(
        Array.from({ length: 20 }, () =>
          userRepository.save(new User(0, 1000000, new Date(), new Date())),
        ),
      );

      // When: 20명이 각각 5개씩 동시 주문
      await Promise.all(
        users.map((user) =>
          orderService.createOrder(user.id, [
            { productOptionId: productOption.id, quantity: 5 },
          ]),
        ),
      );

      // Then: 재고 정확히 100 -> 0
      const finalOption = await productOptionRepository.findById(
        productOption.id,
      );
      expect(finalOption!.reservedStock).toBe(100);
      expect(finalOption!.availableStock).toBe(0);
    });
  });
});
