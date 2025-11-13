import { Injectable } from '@nestjs/common';
import { IOrderRepository, IOrderItemRepository } from '@domain/interfaces';
import { Order } from '@domain/order/order.entity';
import { OrderItem } from '@domain/order/order-item.entity';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

/**
 * Order Repository Implementation (Prisma)
 */
@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get prismaClient(): Prisma.TransactionClient | PrismaService {
    return this.prisma.getClient();
  }

  // ANCHOR findById
  async findById(id: number): Promise<Order | null> {
    const record = await this.prismaClient.orders.findUnique({
      where: { id: BigInt(id) },
    });
    return record ? this.mapToDomain(record) : null;
  }

  // ANCHOR findManyByUserId
  async findManyByUserId(userId: number): Promise<Order[]> {
    const records = await this.prismaClient.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return records.map((record) => this.mapToDomain(record));
  }

  // ANCHOR create
  async create(order: Order): Promise<Order> {
    const created = await this.prismaClient.orders.create({
      data: {
        user_id: order.userId,
        coupon_id: order.couponId,
        total_amount: order.totalAmount,
        discount_amount: order.discountAmount,
        final_amount: order.finalAmount,
        status: String(order.status),
        created_at: order.createdAt,
        paid_at: order.paidAt,
        expired_at: order.expiredAt,
        updated_at: order.updatedAt,
      },
    });
    return this.mapToDomain(created);
  }

  // ANCHOR update
  async update(order: Order): Promise<Order> {
    const updated = await this.prismaClient.orders.update({
      where: { id: BigInt(order.id) },
      data: {
        status: String(order.status),
        paid_at: order.paidAt,
        updated_at: order.updatedAt,
      },
    });
    return this.mapToDomain(updated);
  }

  /**
   * Helper 도메인 맵퍼
   */
  private mapToDomain(record: any): Order {
    const toNumber = (value: any): number => {
      const maybeDecimal = value as { toNumber?: () => number };
      return typeof maybeDecimal?.toNumber === 'function'
        ? maybeDecimal.toNumber()
        : Number(value);
    };

    return new Order(
      Number(record.id),
      record.user_id,
      record.coupon_id,
      toNumber(record.total_amount),
      toNumber(record.discount_amount),
      toNumber(record.final_amount),
      record.status,
      record.created_at,
      record.paid_at,
      record.expired_at,
      record.updated_at,
    );
  }
}

/**
 * OrderItem Repository Implementation (Prisma)
 */
@Injectable()
export class OrderItemRepository implements IOrderItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get prismaClient(): Prisma.TransactionClient | PrismaService {
    return this.prisma.getClient();
  }

  // ANCHOR findManyByOrderId
  async findManyByOrderId(orderId: number): Promise<OrderItem[]> {
    const records = await this.prismaClient.order_items.findMany({
      where: { order_id: BigInt(orderId) },
    });
    return records.map((record) => this.mapToDomain(record));
  }

  // ANCHOR create
  async create(orderItem: OrderItem): Promise<OrderItem> {
    const created = await this.prismaClient.order_items.create({
      data: {
        order_id: BigInt(orderItem.orderId),
        product_option_id: orderItem.productOptionId,
        product_name: orderItem.productName,
        price: orderItem.price,
        quantity: orderItem.quantity,
        subtotal: orderItem.subtotal,
        created_at: orderItem.createdAt,
      },
    });
    return this.mapToDomain(created);
  }

  // ANCHOR createMany
  async createMany(orderItems: OrderItem[]): Promise<OrderItem[]> {
    return Promise.all(orderItems.map((item) => this.create(item)));
  }

  /**
   * Helper 도메인 맵퍼
   */
  private mapToDomain(record: any): OrderItem {
    const toNumber = (value: any): number => {
      const maybeDecimal = value as { toNumber?: () => number };
      return typeof maybeDecimal?.toNumber === 'function'
        ? maybeDecimal.toNumber()
        : Number(value);
    };

    return new OrderItem(
      Number(record.id),
      Number(record.order_id),
      record.product_option_id,
      record.product_name,
      toNumber(record.price),
      record.quantity,
      toNumber(record.subtotal),
      record.created_at,
    );
  }
}
