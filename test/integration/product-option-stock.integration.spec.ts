import { OrderFacade } from '@application/facades/order.facade';
import { UserFacade } from '@application/facades/user.facade';
import { OrderDomainService } from '@domain/order/order.service';
import { ProductDomainService } from '@domain/product/product.service';
import { CouponDomainService } from '@domain/coupon/coupon.service';
import { UserDomainService } from '@domain/user/user.service';
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
  let orderFacade: OrderFacade;
  let userFacade: UserFacade;
  let productRepository: ProductRepository;
  let productOptionRepository: ProductOptionRepository;
  let userRepository: UserRepository;

  beforeEach(() => {
    const orderRepository = new OrderRepository();
    const orderItemRepository = new OrderItemRepository();
    productRepository = new ProductRepository();
    productOptionRepository = new ProductOptionRepository();
    userRepository = new UserRepository();
    const balanceLogRepository = new UserBalanceChangeLogRepository();
    const couponRepository = new CouponRepository();
    const userCouponRepository = new UserCouponRepository();
    const productPopularitySnapshotRepository = new (class {
      async findAll() {
        return [];
      }
      async create() {
        return null;
      }
    })();

    const orderService = new OrderDomainService(
      orderRepository,
      orderItemRepository,
    );
    const productService = new ProductDomainService(
      productRepository,
      productOptionRepository,
      productPopularitySnapshotRepository as any,
    );
    const couponService = new CouponDomainService(
      couponRepository,
      userCouponRepository,
    );
    const userService = new UserDomainService(
      userRepository,
      balanceLogRepository,
    );

    orderFacade = new OrderFacade(
      orderService,
      productService,
      couponService,
      userService,
    );

    userFacade = new UserFacade(userService);
  });

  describe('product-option.stock 동시성', () => {
    it('동시에 20명이 같은 상품 주문 시 재고가 정확히 차감된다', async () => {
      // Given: 재고 100개
      const product = await productRepository.create(
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

      const productOption = await productOptionRepository.create(
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
          userRepository.create(new User(0, 1000000, new Date(), new Date())),
        ),
      );

      // When: 20명이 각각 5개씩 동시 주문
      await Promise.all(
        users.map((user) =>
          orderFacade.createOrder(user.id, [
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
