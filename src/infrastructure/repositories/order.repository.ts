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
}

/**
 * OrderItem Repository Implementation (In-Memory)
 */
@Injectable()
export class OrderItemRepository implements IOrderItemRepository {
  private orderItems: Map<number, OrderItem> = new Map();
  private currentId = 1;

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

  async findRecentOrderItems(days: number): Promise<OrderItem[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.orderItems.values()).filter(
      (item) => item.createdAt >= cutoffDate,
    );
  }
}
