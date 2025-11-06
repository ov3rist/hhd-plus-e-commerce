import { CartItem } from '@domain/cart/cart-item.entity';

/**
 * Cart Repository Port
 * 장바구니 데이터 접근 계약
 */
export abstract class ICartRepository {
  abstract findById(id: number): Promise<CartItem | null>;
  abstract findByUserId(userId: number): Promise<CartItem[]>;
  abstract findByUserIdAndProductOptionId(
    userId: number,
    productOptionId: number,
  ): Promise<CartItem | null>;
  abstract save(cartItem: CartItem): Promise<CartItem>;
  abstract deleteById(id: number): Promise<void>;
}
