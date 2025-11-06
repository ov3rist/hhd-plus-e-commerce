import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CartService } from '@application/cart.service';
import { AddToCartRequestDto, AddToCartResponseDto } from './dto';

/**
 * Cart Controller
 * 장바구니 관리 API 엔드포인트
 */
@ApiTags('cart')
@Controller('api/users/:userId/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * 장바구니 상품 추가 (US-005)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '장바구니 상품 추가',
    description: '장바구니에 상품을 추가하거나 수량을 증가시킵니다.',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({
    status: 201,
    description: '장바구니 추가 완료',
    type: AddToCartResponseDto,
  })
  @ApiResponse({ status: 400, description: '재고 부족' })
  @ApiResponse({ status: 404, description: '상품 옵션을 찾을 수 없음' })
  async addToCart(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AddToCartRequestDto,
  ): Promise<AddToCartResponseDto> {
    return this.cartService.addToCart(
      userId,
      dto.productOptionId,
      dto.quantity,
    );
  }
}
