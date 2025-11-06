import { Injectable } from '@nestjs/common';
import {
  IOrderRepository,
  IOrderItemRepository,
  IProductOptionRepository,
  IProductRepository,
  IUserRepository,
  IUserBalanceChangeLogRepository,
  ICouponRepository,
  IUserCouponRepository,
} from './interfaces';
import { Order } from '@domain/order/order.entity';
import { OrderItem } from '@domain/order/order-item.entity';
import {
  CreateOrderResponseDto,
  OrderItemResponseDto,
} from '@presentation/order/dto';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

/**
 * Order Service
 * 주문/결제 유스케이스
 */
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderItemRepository: IOrderItemRepository,
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
    private readonly userRepository: IUserRepository,
    private readonly balanceLogRepository: IUserBalanceChangeLogRepository,
    private readonly couponRepository: ICouponRepository,
    private readonly userCouponRepository: IUserCouponRepository,
  ) {}

  /**
   * 주문서 생성 (US-008)
   * 재고를 검증하고 임시 선점
   */
  async createOrder(
    userId: number,
    items: Array<{ productOptionId: number; quantity: number }>,
  ): Promise<CreateOrderResponseDto> {
    // 사용자 확인
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND);
    }

    // 재고 검증 및 선점
    let totalAmount = 0;
    const orderItemsData: Array<{
      productOptionId: number;
      productName: string;
      price: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const productOption = await this.productOptionRepository.findById(
        item.productOptionId,
      );
      if (!productOption) {
        throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
      }

      // 재고 확인 및 선점
      productOption.reserveStock(item.quantity);
      await this.productOptionRepository.save(productOption);

      // 상품 정보 조회
      const product = await this.productRepository.findById(
        productOption.productId,
      );
      if (!product) {
        throw new DomainException(ErrorCode.PRODUCT_NOT_FOUND);
      }

      // 주문 항목 데이터 저장
      orderItemsData.push({
        productOptionId: item.productOptionId,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
      });

      totalAmount += product.price * item.quantity;
    }

    // 주문 생성
    const order = Order.create(0, userId, totalAmount);
    const savedOrder = await this.orderRepository.save(order);

    // 주문 항목 저장
    const orderItems = orderItemsData.map((item) =>
      OrderItem.create(
        0,
        savedOrder.id,
        item.productOptionId,
        item.productName,
        item.price,
        item.quantity,
      ),
    );
    const savedOrderItems = await this.orderItemRepository.saveAll(orderItems);

    const itemDtos: OrderItemResponseDto[] = savedOrderItems.map((item) => ({
      orderItemId: item.id,
      productName: item.productName,
      productOptionId: item.productOptionId,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    return {
      orderId: savedOrder.id,
      userId: savedOrder.userId,
      items: itemDtos,
      totalAmount: savedOrder.totalAmount,
      status: savedOrder.status.value,
      createdAt: savedOrder.createdAt,
      expiresAt: savedOrder.expiredAt,
    };
  }
}
