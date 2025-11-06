import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * 쿠폰 상태 enum
 */
export enum CouponStatusFilter {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

/**
 * 보유 쿠폰 조회 쿼리 DTO
 */
export class GetUserCouponsQueryDto {
  @ApiPropertyOptional({
    description: '쿠폰 상태 필터',
    enum: CouponStatusFilter,
    example: CouponStatusFilter.AVAILABLE,
  })
  @IsEnum(CouponStatusFilter)
  @IsOptional()
  status?: CouponStatusFilter;
}

/**
 * 쿠폰 정보 DTO
 */
export class CouponDto {
  @ApiProperty({ description: '사용자 쿠폰 ID' })
  userCouponId: number;

  @ApiProperty({ description: '쿠폰 ID' })
  couponId: number;

  @ApiProperty({ description: '쿠폰 이름' })
  couponName: string;

  @ApiProperty({ description: '할인율 (%)' })
  discountRate: number;

  @ApiProperty({ description: '쿠폰 상태' })
  status: string;

  @ApiProperty({ description: '만료 시각' })
  expiresAt: Date;

  @ApiProperty({ description: '발급 시각' })
  issuedAt: Date;

  @ApiProperty({ description: '사용 시각', nullable: true })
  usedAt: Date | null;
}

/**
 * 보유 쿠폰 조회 응답 DTO
 */
export class GetUserCouponsResponseDto {
  @ApiProperty({
    description: '쿠폰 목록',
    type: [CouponDto],
  })
  coupons: CouponDto[];
}
