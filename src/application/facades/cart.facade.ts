// CART FACADE

import { CartDomainService, CartItem } from '@domain/cart';
import { Product, ProductDomainService, ProductOption } from '@domain/product';
import { Injectable } from '@nestjs/common';

export class CartViewDto {
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
    // TODO
    return;
  }
}
