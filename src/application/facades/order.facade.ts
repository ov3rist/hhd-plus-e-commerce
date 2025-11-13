import { Injectable } from '@nestjs/common';
import { Order, OrderDomainService, OrderItem } from '@domain/order';
import { CouponDomainService } from '@domain/coupon';
import { UserDomainService } from '@domain/user';

export interface OrderItemInput {
  productOptionId: number;
  quantity: number;
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

export interface OrderItemView {
  orderItemId: number;
  productOptionId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
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

@Injectable()
export class OrderFacade {
  constructor(
    private readonly orderService: OrderDomainService,
    private readonly couponService: CouponDomainService,
    private readonly userService: UserDomainService,
  ) {}

  /**
   * ANCHOR 주문 생성
   */
  async createOrder(userId: number, items: OrderItemInput[]): Promise<void> {
    // TODO: 실제 주문 생성 로직 구현
    return null as any;
  }

  /**
   * ANCHOR 결제 처리
   */
  async processPayment(
    orderId: number,
    userId: number,
    userCouponId?: number,
  ): Promise<void> {
    // TODO: 실제 결제 처리 로직 구현
    return null as any;
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
      items: items.map((item) => ({
        orderItemId: item.id,
        productOptionId: item.productOptionId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      status: order.status.value,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    };
  }
}
