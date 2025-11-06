import { Injectable } from '@nestjs/common';
import {
  IOrderRepository,
  IOrderItemRepository,
} from '@application/interfaces';
import { Order } from '@domain/order/order.entity';
import { OrderItem } from '@domain/order/order-item.entity';

/**
 * Order Repository Implementation (In-Memory)
 */
@Injectable()
export class OrderRepository implements IOrderRepository {
  private orders: Map<number, Order> = new Map();
  private currentId = 1;

  async findById(id: number): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async findByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter((order) => order.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(order: Order): Promise<Order> {
    if (order.id === 0) {
      const newOrder = new Order(
        this.currentId++,
        order.userId,
        order.couponId,
        order.totalAmount,
        order.discountAmount,
        order.finalAmount,
        order.status,
        order.createdAt,
        order.paidAt,
        order.expiredAt,
        order.updatedAt,
      );
      this.orders.set(newOrder.id, newOrder);
      return newOrder;
    }

    this.orders.set(order.id, order);
    return order;
  }

  async findExpiredPendingOrders(): Promise<Order[]> {
    const now = new Date();
    return Array.from(this.orders.values()).filter(
      (order) => order.status.isPending() && order.expiredAt < now,
    );
  }
}

/**
 * OrderItem Repository Implementation (In-Memory)
 */
@Injectable()
export class OrderItemRepository implements IOrderItemRepository {
  private orderItems: Map<number, OrderItem> = new Map();
  private currentId = 1;

  constructor(private readonly orderRepository: OrderRepository) {}

  async findByOrderId(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (item) => item.orderId === orderId,
    );
  }

  async save(orderItem: OrderItem): Promise<OrderItem> {
    if (orderItem.id === 0) {
      const newItem = new OrderItem(
        this.currentId++,
        orderItem.orderId,
        orderItem.productOptionId,
        orderItem.productName,
        orderItem.price,
        orderItem.quantity,
        orderItem.subtotal,
        orderItem.createdAt,
      );
      this.orderItems.set(newItem.id, newItem);
      return newItem;
    }

    this.orderItems.set(orderItem.id, orderItem);
    return orderItem;
  }

  async saveAll(orderItems: OrderItem[]): Promise<OrderItem[]> {
    const savedItems: OrderItem[] = [];
    for (const item of orderItems) {
      savedItems.push(await this.save(item));
    }
    return savedItems;
  }

  /**
   * 최근 N일간 결제 완료된 주문의 아이템 조회
   * US-003: 인기 상품 집계는 결제 완료된 주문만 포함
   */
  async findRecentPaidOrderItems(days: number): Promise<OrderItem[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 주문 아이템 중에서 결제 완료된 주문에 속한 것만 필터링
    const paidOrderItems: OrderItem[] = [];

    for (const item of this.orderItems.values()) {
      // 최근 N일 이내 생성된 아이템만
      if (item.createdAt < cutoffDate) continue;

      // 해당 주문이 PAID 상태인지 확인
      const order = await this.orderRepository.findById(item.orderId);
      if (order && order.status.isPaid() && order.paidAt) {
        // paidAt 기준으로 최근 N일 체크
        if (order.paidAt >= cutoffDate) {
          paidOrderItems.push(item);
        }
      }
    }

    return paidOrderItems;
  }
}
