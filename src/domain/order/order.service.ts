import { Injectable } from '@nestjs/common';
import { IOrderItemRepository, IOrderRepository } from '@domain/interfaces';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ValidationException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

/**
 * OrderDomainService
 * 주문 관련 영속성 계층과 상호작용하며 핵심 비즈니스 로직을 담당한다.
 */
@Injectable()
export class OrderDomainService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderItemRepository: IOrderItemRepository,
  ) {}

  /**
   * ANCHOR 주문서 생성
   */
  async createOrder(order: Order): Promise<Order> {
    const createdOrder = await this.orderRepository.create(order);
    return createdOrder;
  }

  /**
   * ANCHOR 주문 아이템 생성
   */
  async createOrderItem(orderItem: OrderItem): Promise<OrderItem> {
    const createdOrderItem = await this.orderItemRepository.create(orderItem);
    return createdOrderItem;
  }

  /**
   * ANCHOR 주문 조회
   */
  async getOrder(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new ValidationException(ErrorCode.ORDER_NOT_FOUND);
    }
    return order;
  }

  /**
   * ANCHOR 주문 아이템 조회
   */
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const items = await this.orderItemRepository.findManyByOrderId(orderId);
    return items;
  }

  /**
   * ANCHOR 사용자 주문 목록 조회
   */
  async getOrders(userId: number): Promise<Order[]> {
    const orders = await this.orderRepository.findManyByUserId(userId);
    return orders;
  }
}
