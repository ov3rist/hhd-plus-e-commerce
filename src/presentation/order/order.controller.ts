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
import { CreateOrderRequestDto, CreateOrderResponseDto } from './dto';

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
}
