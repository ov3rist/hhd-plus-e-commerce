import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductService } from '@application/product.service';
import { GetProductsResponseDto, GetProductDetailResponseDto } from './dto';

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

  /**
   * 상품 상세 조회 (US-002)
   */
  @Get(':productId')
  @ApiOperation({
    summary: '상품 상세 조회',
    description: '특정 상품의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'productId', description: '상품 ID' })
  @ApiResponse({
    status: 200,
    description: '상품 상세 조회 성공',
    type: GetProductDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: '상품을 찾을 수 없음' })
  async getProductDetail(
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<GetProductDetailResponseDto> {
    return await this.productService.getProductDetail(productId);
  }
}
