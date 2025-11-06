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
  ProcessPaymentResponseDto,
  GetOrdersResponseDto,
  OrderDto,
  OrderItemDetailDto,
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

  /**
   * 결제 처리 (US-009)
   * 잔액 차감, 재고 확정, 쿠폰 사용 처리
   */
  async processPayment(
    orderId: number,
    userId: number,
    userCouponId?: number,
  ): Promise<ProcessPaymentResponseDto> {
    // 주문 조회
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new DomainException(ErrorCode.ORDER_NOT_FOUND);
    }

    if (!order.isOwnedBy(userId)) {
      throw new DomainException(ErrorCode.UNAUTHORIZED_ORDER_ACCESS);
    }

    // 결제 가능 여부 확인
    if (!order.canPay()) {
      throw new DomainException(ErrorCode.INVALID_ORDER_STATUS);
    }

    // 쿠폰 적용
    let finalAmount = order.totalAmount;
    if (userCouponId) {
      const userCoupon = await this.userCouponRepository.findById(userCouponId);
      if (!userCoupon) {
        throw new DomainException(ErrorCode.COUPON_NOT_FOUND);
      }

      const coupon = await this.couponRepository.findById(userCoupon.couponId);
      if (!coupon) {
        throw new DomainException(ErrorCode.COUPON_INFO_NOT_FOUND);
      }

      if (userId !== userCoupon.userId) {
        throw new DomainException(ErrorCode.UNAUTHORIZED_ORDER_ACCESS);
      }

      // 쿠폰 사용 가능 여부 확인
      userCoupon.use(order.id);
      await this.userCouponRepository.save(userCoupon);

      // 할인 금액 계산
      const discountAmount = coupon.calculateDiscount(order.totalAmount);
      finalAmount = order.totalAmount - discountAmount;

      order.discountAmount = discountAmount;
      order.finalAmount = finalAmount;
      order.couponId = coupon.id;
    }

    // 사용자 잔액 차감
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND);
    }

    const balanceLog = user.deduct(finalAmount, '주문 결제', order.id);
    await this.userRepository.save(user);
    await this.balanceLogRepository.save(balanceLog);

    // 재고 확정 차감 (선점 해제)
    const orderItems = await this.orderItemRepository.findByOrderId(order.id);
    for (const orderItem of orderItems) {
      const productOption = await this.productOptionRepository.findById(
        orderItem.productOptionId,
      );
      if (!productOption) {
        throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
      }

      productOption.decreaseStock(orderItem.quantity);
      await this.productOptionRepository.save(productOption);
    }

    // 주문 상태 업데이트
    order.pay();
    const savedOrder = await this.orderRepository.save(order);

    return {
      orderId: savedOrder.id,
      status: savedOrder.status.value,
      paidAmount: finalAmount,
      remainingBalance: user.balance,
      paidAt: savedOrder.paidAt!,
    };
  }

  /**
   * 주문 내역 조회 (US-012)
   */
  async getOrdersByUser(
    userId: number,
    statusFilter?: string,
  ): Promise<GetOrdersResponseDto> {
    let orders = await this.orderRepository.findByUserId(userId);

    // 상태 필터링 (선택적)
    if (statusFilter) {
      orders = orders.filter((order) => order.status.value === statusFilter);
    }

    const orderDtos: OrderDto[] = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await this.orderItemRepository.findByOrderId(
          order.id,
        );

        const items: OrderItemDetailDto[] = await Promise.all(
          orderItems.map(async (item) => {
            const productOption = await this.productOptionRepository.findById(
              item.productOptionId,
            );
            if (!productOption) {
              throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
            }

            return {
              productId: productOption.productId,
              productName: item.productName,
              productOptionId: item.productOptionId,
              price: item.price,
              quantity: item.quantity,
              subtotal: item.subtotal,
            };
          }),
        );

        return {
          orderId: order.id,
          items,
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          finalAmount: order.finalAmount,
          status: order.status.value,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
        };
      }),
    );

    return { orders: orderDtos };
  }
}
