// CART FACADE

import { CartDomainService, CartItem } from '@domain/cart';
import { Product, ProductDomainService, ProductOption } from '@domain/product';
import { Injectable } from '@nestjs/common';

export interface CartViewDto {
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
   */
  async getCartView(userId: number): Promise<CartViewDto[]> {
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
