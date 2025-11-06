import { Order } from '@domain/order/order.entity';
import { OrderItem } from '@domain/order/order-item.entity';

/**
 * Order Repository Port
 * 주문 데이터 접근 계약
 */
export abstract class IOrderRepository {
  abstract findById(id: number): Promise<Order | null>;
  abstract findByUserId(userId: number): Promise<Order[]>;
  abstract save(order: Order): Promise<Order>;
}

/**
 * OrderItem Repository Port
 * 주문 상품 데이터 접근 계약
 */
export abstract class IOrderItemRepository {
  abstract findByOrderId(orderId: number): Promise<OrderItem[]>;
  abstract save(orderItem: OrderItem): Promise<OrderItem>;
  abstract saveAll(orderItems: OrderItem[]): Promise<OrderItem[]>;
  abstract findRecentOrderItems(days: number): Promise<OrderItem[]>;
}
