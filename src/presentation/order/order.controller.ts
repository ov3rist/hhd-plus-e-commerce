import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrderService } from '@application/order.service';
import {
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  ProcessPaymentRequestDto,
  ProcessPaymentResponseDto,
  GetOrdersQueryDto,
  GetOrdersResponseDto,
  GetOrderDetailResponseDto,
} from './dto';

/**
 * Order Controller
 * 주문/결제 API 엔드포인트
 */
@ApiTags('orders')
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * 주문서 생성 (US-008)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '주문서 생성',
    description: '주문서를 생성하고 재고를 임시 선점합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '주문서 생성 완료',
    type: CreateOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: '재고 부족' })
  @ApiResponse({ status: 404, description: '사용자 또는 상품을 찾을 수 없음' })
  async createOrder(
    @Body() dto: CreateOrderRequestDto,
  ): Promise<CreateOrderResponseDto> {
    return this.orderService.createOrder(dto.userId, dto.items);
  }

  /**
   * 결제 처리 (US-009)
   */
  @Post(':orderId/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결제 처리',
    description: '주문에 대한 결제를 처리합니다.',
  })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({
    status: 200,
    description: '결제 완료',
    type: ProcessPaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: '잔액 부족 또는 주문서 만료' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  async processPayment(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: ProcessPaymentRequestDto,
  ): Promise<ProcessPaymentResponseDto> {
    return this.orderService.processPayment(
      orderId,
      dto.userId,
      dto.userCouponId,
    );
  }

  /**
   * 주문 내역 조회 (US-012)
   */
  @Get('users/:userId')
  @ApiOperation({
    summary: '주문 내역 조회',
    description: '사용자의 주문 내역을 조회합니다.',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '주문 내역 조회 성공',
    type: GetOrdersResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getOrdersByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: GetOrdersQueryDto,
  ): Promise<GetOrdersResponseDto> {
    return this.orderService.getOrdersByUser(userId, query.status);
  }

  /**
   * 주문 상세 조회
   */
  @Get(':orderId')
  @ApiOperation({
    summary: '주문 상세 조회',
    description: '특정 주문의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'orderId', description: '주문 ID' })
  @ApiResponse({
    status: 200,
    description: '주문 상세 조회 성공',
    type: GetOrderDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: '주문을 찾을 수 없음' })
  async getOrderDetail(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<GetOrderDetailResponseDto> {
    return this.orderService.getOrderDetail(orderId);
  }
}
