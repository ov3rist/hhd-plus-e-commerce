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
import { CartFacade } from '@application/facades/cart.facade';
import {
  AddToCartRequestDto,
  AddToCartResponseDto,
  GetCartResponseDto,
} from './dto';

/**
 * Cart Controller
 * 장바구니 관리 API 엔드포인트
 */
@ApiTags('cart')
@Controller('api/users/:userId/cart')
export class CartController {
  constructor(private readonly cartFacade: CartFacade) {}

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
    return this.cartFacade.addToCart(userId, dto.productOptionId, dto.quantity);
  }

  /**
   * 장바구니 조회 (US-006)
   */
  @Get()
  @ApiOperation({
    summary: '장바구니 조회',
    description: '장바구니에 담긴 상품 목록을 조회합니다.',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({
    status: 200,
    description: '장바구니 조회 성공',
    type: GetCartResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getCart(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<GetCartResponseDto> {
    return this.cartFacade.getCart(userId);
  }

  /**
   * 장바구니 상품 삭제 (US-007)
   */
  @Delete(':cartItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '장바구니 상품 삭제',
    description: '장바구니에서 특정 상품을 삭제합니다.',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiParam({ name: 'cartItemId', description: '장바구니 항목 ID' })
  @ApiResponse({
    status: 204,
    description: '장바구니 항목 삭제 완료',
  })
  @ApiResponse({ status: 404, description: '장바구니 항목을 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async removeFromCart(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('cartItemId', ParseIntPipe) cartItemId: number,
  ): Promise<void> {
    await this.cartFacade.removeFromCart(userId, cartItemId);
  }
}
