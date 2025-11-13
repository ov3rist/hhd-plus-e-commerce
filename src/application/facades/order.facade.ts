import { Injectable } from '@nestjs/common';
import { OrderDomainService, OrderItem } from '@domain/order';
import { CouponDomainService } from '@domain/coupon';
import { UserDomainService } from '@domain/user';
import { ProductDomainService } from '@domain/product';
import { ValidationException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

export interface OrderItemInput {
  productOptionId: number;
  quantity: number;
}

export interface OrderItemView {
  orderItemId: number;
  productOptionId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderCreateView {
  orderId: number;
  userId: number;
  items: OrderItemView[];
  totalAmount: number;
  status: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OrderListView {
  orderId: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface OrderDetailView {
  orderId: number;
  userId: number;
  items: OrderItemView[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
}

export interface OrderPaymentView {
  orderId: number;
  status: string;
  paidAmount: number;
  remainingBalance: number;
  paidAt: Date;
}

@Injectable()
export class OrderFacade {
  constructor(
    private readonly orderService: OrderDomainService,
    private readonly productService: ProductDomainService,
    private readonly couponService: CouponDomainService,
    private readonly userService: UserDomainService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * OrderItem을 OrderItemView로 변환
   */
  private toOrderItemView(item: OrderItem): OrderItemView {
    return {
      orderItemId: item.id,
      productOptionId: item.productOptionId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    };
  }

  /**
   * ANCHOR 주문 생성
   * 트랜잭션으로 재고 선점 + 주문 생성을 원자적으로 처리
   */
  async createOrder(
    userId: number,
    items: OrderItemInput[],
  ): Promise<OrderCreateView> {
    return await this.prisma.runInTransaction(async () => {
      await this.userService.getUser(userId);

      // 상품 정보 조회 및 재고 선점
      const orderItemsData =
        await this.productService.reserveProductsForOrder(items); // save

      // 총액 계산
      const totalAmount = orderItemsData.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // 주문 생성
      const createdOrder = await this.orderService.createPendingOrder(
        userId,
        totalAmount,
      ); // save

      // 주문 항목 생성
      const createdOrderItems = await this.orderService.createOrderItems(
        createdOrder.id,
        orderItemsData,
      ); // save

      return {
        orderId: createdOrder.id,
        userId: createdOrder.userId,
        items: createdOrderItems.map((item) => this.toOrderItemView(item)),
        totalAmount: createdOrder.totalAmount,
        status: createdOrder.status.value,
        createdAt: createdOrder.createdAt,
        expiresAt: createdOrder.expiredAt,
      };
    });
  }

  /**
   * ANCHOR 결제 처리
   * 트랜잭션으로 쿠폰 사용 + 잔액 차감 + 결제 처리 + 재고 확정을 원자적으로 처리
   */
  async processPayment(
    orderId: number,
    userId: number,
    userCouponId?: number,
  ): Promise<OrderPaymentView> {
    return await this.prisma.runInTransaction(async () => {
      // 주문 조회 및 소유권 확인
      const order = await this.orderService.getOrder(orderId);
      if (!order.isOwnedBy(userId)) {
        throw new ValidationException(ErrorCode.UNAUTHORIZED);
      }

      // 쿠폰 적용 (선택사항)
      if (userCouponId) {
        const userCoupon = await this.couponService.getUserCoupon(userCouponId);
        const coupon = await this.couponService.getCoupon(userCoupon.couponId);

        // 쿠폰 사용 처리 및 할인 적용
        userCoupon.use(orderId);
        const discountAmount = coupon.calculateDiscount(order.totalAmount);
        order.applyCoupon(coupon.id, discountAmount);

        await this.couponService.updateUserCoupon(userCoupon);
      }

      // 사용자 잔액 차감 (먼저 실행 - 실패 시 트랜잭션 롤백)
      const user = await this.userService.deductUser(
        userId,
        order.finalAmount,
        orderId,
        `주문 ${orderId} 결제`,
      );

      // 결제 처리
      order.pay();
      await this.orderService.updateOrder(order);

      // 재고 확정 차감 (선점 → 확정)
      const orderItems = await this.orderService.getOrderItems(orderId);
      for (const item of orderItems) {
        await this.productService.confirmPaymentStock(
          item.productOptionId,
          item.quantity,
        );
      }

      return {
        orderId: order.id,
        status: order.status.value,
        paidAmount: order.finalAmount,
        remainingBalance: user.balance,
        paidAt: order.paidAt!,
      };
    });
  }

  /**
   * ANCHOR 주문 내역 조회
   */
  async getOrders(userId: number): Promise<OrderListView[]> {
    const orders = await this.orderService.getOrders(userId);

    return orders.map((order) => ({
      orderId: order.id,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      status: order.status.value,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    }));
  }

  /**
   * ANCHOR 주문 상세 조회
   */
  async getOrderDetail(orderId: number): Promise<OrderDetailView> {
    const order = await this.orderService.getOrder(orderId);
    const items = await this.orderService.getOrderItems(orderId);
    return {
      orderId: order.id,
      userId: order.userId,
      items: items.map((item) => this.toOrderItemView(item)),
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      status: order.status.value,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    };
  }
}
