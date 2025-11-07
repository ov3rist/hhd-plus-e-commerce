import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * 주문 상태 enum
 */
export enum OrderStatusFilter {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * 주문 내역 조회 쿼리 DTO
 */
export class GetOrdersQueryDto {
  @ApiPropertyOptional({
    description: '주문 상태 필터',
    enum: OrderStatusFilter,
    example: OrderStatusFilter.PAID,
  })
  @IsEnum(OrderStatusFilter)
  @IsOptional()
  status?: OrderStatusFilter;
}

/**
 * 주문 항목 DTO (조회용)
 */
export class OrderItemDetailDto {
  @ApiProperty({ description: '상품 ID' })
  productId: number;

  @ApiProperty({ description: '상품명' })
  productName: string;

  @ApiProperty({ description: '상품 옵션 ID' })
  productOptionId: number;

  @ApiProperty({ description: '가격' })
  price: number;

  @ApiProperty({ description: '수량' })
  quantity: number;

  @ApiProperty({ description: '소계' })
  subtotal: number;
}

/**
 * 주문 정보 DTO
 */
export class OrderDto {
  @ApiProperty({ description: '주문 ID' })
  orderId: number;

  @ApiProperty({ description: '주문 항목 목록', type: [OrderItemDetailDto] })
  items: OrderItemDetailDto[];

  @ApiProperty({ description: '총 주문 금액' })
  totalAmount: number;

  @ApiProperty({ description: '할인 금액' })
  discountAmount: number;

  @ApiProperty({ description: '최종 결제 금액' })
  finalAmount: number;

  @ApiProperty({ description: '주문 상태' })
  status: string;

  @ApiProperty({ description: '주문 생성 시각' })
  createdAt: Date;

  @ApiProperty({ description: '결제 완료 시각', nullable: true })
  paidAt: Date | null;
}

/**
 * 주문 내역 조회 응답 DTO
 */
export class GetOrdersResponseDto {
  @ApiProperty({
    description: '주문 목록',
    type: [OrderDto],
  })
  orders: OrderDto[];
}

/**
 * 주문 상세 조회 응답 DTO
 */
export class GetOrderDetailResponseDto {
  @ApiProperty({ description: '주문 ID' })
  orderId: number;

  @ApiProperty({ description: '사용자 ID' })
  userId: number;

  @ApiProperty({ description: '주문 항목 목록', type: [OrderItemDetailDto] })
  items: OrderItemDetailDto[];

  @ApiProperty({ description: '총 주문 금액' })
  totalAmount: number;

  @ApiProperty({ description: '할인 금액' })
  discountAmount: number;

  @ApiProperty({ description: '최종 결제 금액' })
  finalAmount: number;

  @ApiProperty({ description: '주문 상태' })
  status: string;

  @ApiProperty({ description: '주문 생성 시각' })
  createdAt: Date;

  @ApiProperty({ description: '결제 완료 시각', nullable: true })
  paidAt: Date | null;
}
