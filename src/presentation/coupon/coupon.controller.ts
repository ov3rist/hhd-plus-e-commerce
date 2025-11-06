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
import { CouponService } from '@application/coupon.service';
import { IssueCouponRequestDto, IssueCouponResponseDto } from './dto';

/**
 * Coupon Controller
 * 쿠폰 발급 및 조회 API 엔드포인트
 */
@ApiTags('coupons')
@Controller('api/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  /**
   * 쿠폰 발급 (US-013)
   */
  @Post(':couponId/issue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '쿠폰 발급',
    description: '선착순으로 쿠폰을 발급받습니다.',
  })
  @ApiParam({ name: 'couponId', description: '쿠폰 ID' })
  @ApiResponse({
    status: 201,
    description: '쿠폰 발급 완료',
    type: IssueCouponResponseDto,
  })
  @ApiResponse({ status: 400, description: '쿠폰 품절 또는 이미 발급됨' })
  @ApiResponse({ status: 404, description: '쿠폰을 찾을 수 없음' })
  async issueCoupon(
    @Param('couponId', ParseIntPipe) couponId: number,
    @Body() dto: IssueCouponRequestDto,
  ): Promise<IssueCouponResponseDto> {
    return this.couponService.issueCoupon(dto.userId, couponId);
  }
}
