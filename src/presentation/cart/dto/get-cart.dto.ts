import { ApiProperty } from '@nestjs/swagger';

/**
 * 장바구니 항목 DTO
 */
export class CartItemDto {
  @ApiProperty({ description: '장바구니 항목 ID' })
  cartItemId: number;

  @ApiProperty({ description: '상품 ID' })
  productId: number;

  @ApiProperty({ description: '상품명' })
  productName: string;

  @ApiProperty({ description: '상품 옵션 ID' })
  productOptionId: number;

  @ApiProperty({ description: '옵션 색상', nullable: true })
  optionColor: string | null;

  @ApiProperty({ description: '옵션 사이즈', nullable: true })
  optionSize: string | null;

  @ApiProperty({ description: '가격' })
  price: number;

  @ApiProperty({ description: '수량' })
  quantity: number;

  @ApiProperty({ description: '소계' })
  subtotal: number;
}

/**
 * 장바구니 조회 응답 DTO
 */
export class GetCartResponseDto {
  @ApiProperty({
    description: '장바구니 항목 목록',
    type: [CartItemDto],
  })
  items: CartItemDto[];

  @ApiProperty({ description: '총 금액' })
  totalAmount: number;
}
