// CART FACADE

import { CartDomainService, CartItem } from '@domain/cart';
import { Product, ProductDomainService, ProductOption } from '@domain/product';
import { Injectable } from '@nestjs/common';

export interface CartItemView {
  cartItemId: number;
  productId: number;
  productName: string;
  productOptionId: number;
  productOptionColor: string | null;
  productOptionSize: string | null;
  price: number;
  quantity: number;
}

@Injectable()
export class CartFacade {
  constructor(
    private readonly cartService: CartDomainService,
    private readonly productService: ProductDomainService,
  ) {}

  /**
   * ANCHOR 장바구니-상품옵션 조회 뷰 반환
   *
   * TODO: [성능 개선 필요] N+1 쿼리 문제
   * 원인: 각 장바구니 아이템마다 개별적으로 상품옵션과 상품을 조회
   * - cartItems.length만큼 productService.getProductOption() 호출
   * - productIds.length만큼 productService.getProduct() 호출
   *
   * 개선 방안:
   * 1. Repository에 IN 절을 사용한 일괄 조회 메서드 추가
   *    - findManyByIds(ids: number[]): Promise<ProductOption[]>
   *    - findProductsByIds(ids: number[]): Promise<Product[]>
   * 2. 또는 JOIN을 활용한 단일 쿼리로 최적화
   *    - cart_items LEFT JOIN product_options LEFT JOIN products
   *
   * 예상 효과: O(n) 쿼리 → O(1) 쿼리로 개선
   */
  async getCartView(userId: number): Promise<CartItemView[]> {
    // 카트 조회
    const cartItems = await this.cartService.getCart(userId);

    const optionIds = cartItems.map((item) => item.productOptionId);

    // 상품 옵션 및 상품 조회 후 뷰 매핑
    const productOptions = await Promise.all(
      optionIds.map((id) => this.productService.getProductOption(id)),
    );

    const productIds = productOptions.map((option) => option.productId);
    const products = await Promise.all(
      productIds.map((id) => this.productService.getProduct(id)),
    );
    const productMap = new Map<number, Product>();
    products.forEach((product) => productMap.set(product.id, product));

    const productOptionMap = new Map<number, ProductOption>();
    productOptions.forEach((option) => productOptionMap.set(option.id, option));

    return cartItems.map((item) => {
      const option = productOptionMap.get(item.productOptionId)!;
      const product = productMap.get(option.productId)!;

      return {
        cartItemId: item.id,
        productId: product.id,
        productName: product.name,
        productOptionId: option.id,
        productOptionColor: option.color,
        productOptionSize: option.size,
        price: product.price,
        quantity: item.quantity,
      };
    });
  }
}
