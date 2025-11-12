import { Injectable } from '@nestjs/common';
import {
  ICouponRepository,
  IOrderItemRepository,
  IOrderRepository,
  IProductOptionRepository,
  IProductRepository,
  IUserCouponRepository,
} from '@domain/interfaces';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '@domain/product/product.entity';
import { ProductOption } from '@domain/product/product-option.entity';
import { Coupon } from '@domain/coupon/coupon.entity';
import { UserCoupon } from '@domain/coupon/user-coupon.entity';
import { User } from '@domain/user/user.entity';
import {
  UserDomainService,
  BalanceLogQuery,
  BalanceLogResult,
} from '@domain/user/user.service';
import { UserBalanceChangeLog } from '@domain/user/user-balance-change-log.entity';

export interface OrderLine {
  product: Product;
  productOption: ProductOption;
  quantity: number;
}

export interface OrderPreparation {
  lines: OrderLine[];
  totalAmount: number;
}

export interface OrderAggregate {
  order: Order;
  items: OrderItem[];
}

export interface OrderSnapshotItem {
  orderItem: OrderItem;
  productOption: ProductOption;
}

export interface OrderSnapshot {
  order: Order;
  items: OrderSnapshotItem[];
}

export interface CouponApplicationResult {
  discountAmount: number;
  coupon?: Coupon;
  userCoupon?: UserCoupon;
}

/**
 * OrderDomainService
 * 주문 생성 및 결제에 필요한 도메인 로직을 캡슐화한다.
 */
@Injectable()
export class OrderDomainService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderItemRepository: IOrderItemRepository,
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
    private readonly userDomainService: UserDomainService,
  ) {}

  /**
   * 사용자 조회 (없으면 예외)
   */
  async loadUserOrFail(userId: number): Promise<User> {
    return this.userDomainService.loadUserOrFail(userId);
  }

  /**
   * 주문 로드 (없으면 예외)
   */
  async loadOrderOrFail(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new DomainException(ErrorCode.ORDER_NOT_FOUND);
    }
    return order;
  }

  /**
   * 사용자 권한 검증
   */
  ensureOrderBelongsToUser(order: Order, userId: number): void {
    if (!order.isOwnedBy(userId)) {
      throw new DomainException(ErrorCode.UNAUTHORIZED_ORDER_ACCESS);
    }
  }

  /**
   * 결제 가능 상태 검증
   */
  ensureOrderIsPayable(order: Order): void {
    if (!order.canPay()) {
      throw new DomainException(ErrorCode.INVALID_ORDER_STATUS);
    }
  }

  /**
   * 주문 항목 정보 및 재고 선점 준비
   */
  async prepareOrderLines(
    items: Array<{ productOptionId: number; quantity: number }>,
  ): Promise<OrderPreparation> {
    const lines: OrderLine[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const productOption = await this.loadProductOptionOrFail(
        item.productOptionId,
      );
      productOption.reserveStock(item.quantity);
      await this.productOptionRepository.save(productOption);

      const product = await this.loadProductOrFail(productOption.productId);

      lines.push({
        product,
        productOption,
        quantity: item.quantity,
      });

      totalAmount += product.price * item.quantity;
    }

    return { lines, totalAmount };
  }

  /**
   * 주문 객체 생성
   */
  createPendingOrder(userId: number, totalAmount: number): Order {
    return Order.create(0, userId, totalAmount);
  }

  /**
   * 주문/주문항목 저장
   */
  async persistOrder(
    order: Order,
    preparation: OrderPreparation,
  ): Promise<OrderAggregate> {
    const savedOrder = await this.orderRepository.save(order);

    const orderItems = preparation.lines.map((line) =>
      OrderItem.create(
        0,
        savedOrder.id,
        line.productOption.id,
        line.product.name,
        line.product.price,
        line.quantity,
      ),
    );
    const savedItems = await this.orderItemRepository.saveAll(orderItems);

    return { order: savedOrder, items: savedItems };
  }

  /**
   * 쿠폰 적용 (선택)
   */
  async applyCouponIfNeeded(
    order: Order,
    userId: number,
    userCouponId?: number,
  ): Promise<CouponApplicationResult> {
    if (!userCouponId) {
      return { discountAmount: 0 };
    }

    const userCoupon = await this.userCouponRepository.findById(userCouponId);
    if (!userCoupon) {
      throw new DomainException(ErrorCode.COUPON_NOT_FOUND);
    }

    if (userCoupon.userId !== userId) {
      throw new DomainException(ErrorCode.UNAUTHORIZED_ORDER_ACCESS);
    }

    const coupon = await this.couponRepository.findById(userCoupon.couponId);
    if (!coupon) {
      throw new DomainException(ErrorCode.COUPON_INFO_NOT_FOUND);
    }

    const discountAmount = coupon.calculateDiscount(order.totalAmount);
    userCoupon.use(order.id);
    await this.userCouponRepository.save(userCoupon);

    order.discountAmount = discountAmount;
    order.finalAmount = order.totalAmount - discountAmount;
    order.couponId = coupon.id;

    return {
      discountAmount,
      coupon,
      userCoupon,
    };
  }

  /**
   * 사용자 잔액 차감 및 로그 생성
   */
  deductUserBalance(user: User, order: Order): UserBalanceChangeLog {
    return this.userDomainService.deductUser(
      user,
      order.finalAmount,
      '주문 결제',
      order.id,
    );
  }

  /**
   * 사용자 및 로그 저장
   */
  async persistUserAndLog(
    user: User,
    log: UserBalanceChangeLog,
  ): Promise<void> {
    await this.userDomainService.persistUser(user);
    await this.userDomainService.persistBalanceLog(log);
  }

  /**
   * 주문 항목 조회
   */
  async loadOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.orderItemRepository.findByOrderId(orderId);
  }

  /**
   * 재고 확정 차감
   */
  async finalizeInventory(orderItems: OrderItem[]): Promise<void> {
    for (const item of orderItems) {
      const productOption = await this.productOptionRepository.findById(
        item.productOptionId,
      );
      if (!productOption) {
        throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
      }

      productOption.decreaseStock(item.quantity);
      await this.productOptionRepository.save(productOption);
    }
  }

  /**
   * 주문 결제 완료 처리
   */
  async markOrderAsPaid(order: Order): Promise<Order> {
    order.pay();
    return this.orderRepository.save(order);
  }

  /**
   * 사용자 주문 목록 조회
   */
  async fetchOrdersByUser(
    userId: number,
    statusFilter?: string,
  ): Promise<OrderSnapshot[]> {
    const orders = await this.orderRepository.findByUserId(userId);
    const filtered = statusFilter
      ? orders.filter((order) => order.status.value === statusFilter)
      : orders;

    const snapshots: OrderSnapshot[] = [];

    for (const order of filtered) {
      snapshots.push(await this.buildOrderSnapshot(order));
    }

    return snapshots;
  }

  /**
   * 주문 상세 스냅샷 조회
   */
  async fetchOrderSnapshot(orderId: number): Promise<OrderSnapshot> {
    const order = await this.loadOrderOrFail(orderId);
    return this.buildOrderSnapshot(order);
  }

  /**
   * 사용자 잔액 로그 조회 (위임)
   */
  async fetchBalanceLogs(
    userId: number,
    filter: BalanceLogQuery,
  ): Promise<BalanceLogResult> {
    return this.userDomainService.fetchBalanceLogs(userId, filter);
  }

  private async buildOrderSnapshot(order: Order): Promise<OrderSnapshot> {
    const orderItems = await this.orderItemRepository.findByOrderId(order.id);
    if (orderItems.length === 0) {
      return { order, items: [] };
    }

    const optionIds = Array.from(
      new Set(orderItems.map((item) => item.productOptionId)),
    );
    const productOptions =
      await this.productOptionRepository.findByIds(optionIds);
    const optionMap = new Map(
      productOptions.map((option) => [option.id, option]),
    );

    const items: OrderSnapshotItem[] = orderItems.map((orderItem) => {
      const productOption = optionMap.get(orderItem.productOptionId);
      if (!productOption) {
        throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
      }

      return { orderItem, productOption };
    });

    return { order, items };
  }

  private async loadProductOptionOrFail(
    productOptionId: number,
  ): Promise<ProductOption> {
    const productOption =
      await this.productOptionRepository.findById(productOptionId);
    if (!productOption) {
      throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }
    return productOption;
  }

  private async loadProductOrFail(productId: number): Promise<Product> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new DomainException(ErrorCode.PRODUCT_NOT_FOUND);
    }
    return product;
  }
}
