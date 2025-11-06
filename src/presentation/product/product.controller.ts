import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductService } from '@application/product.service';
import { GetProductsResponseDto } from './dto';

/**
 * Product Controller
 * 상품 조회 API 엔드포인트
 */
@ApiTags('products')
@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * 상품 목록 조회 (US-001)
   */
  @Get()
  @ApiOperation({
    summary: '상품 목록 조회',
    description: '판매 중인 상품 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '상품 목록 조회 성공',
    type: GetProductsResponseDto,
  })
  async getProducts(): Promise<GetProductsResponseDto> {
    return await this.productService.getProducts();
  }
}
