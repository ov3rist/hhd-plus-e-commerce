import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';

/**
 * 장바구니 추가 요청 DTO
 */
export class AddToCartRequestDto {
  @ApiProperty({
    description: '상품 옵션 ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  productOptionId: number;

  @ApiProperty({
    description: '수량',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * 장바구니 추가 응답 DTO
 */
export class AddToCartResponseDto {
  @ApiProperty({ description: '장바구니 항목 ID' })
  cartItemId: number;

  @ApiProperty({ description: '상품 옵션 ID' })
  productOptionId: number;

  @ApiProperty({ description: '수량' })
  quantity: number;
}
