import { Injectable } from '@nestjs/common';
import { ICartRepository } from '@application/interfaces';
import { CartItem } from '@domain/cart/cart-item.entity';

/**
 * Cart Repository Implementation (In-Memory)
 */
@Injectable()
export class CartRepository implements ICartRepository {
  private cartItems: Map<number, CartItem> = new Map();
  private currentId = 1;

  async findById(id: number): Promise<CartItem | null> {
    return this.cartItems.get(id) || null;
  }

  async findByUserId(userId: number): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      (item) => item.userId === userId,
    );
  }

  async findByUserIdAndProductOptionId(
    userId: number,
    productOptionId: number,
  ): Promise<CartItem | null> {
    return (
      Array.from(this.cartItems.values()).find(
        (item) =>
          item.userId === userId && item.productOptionId === productOptionId,
      ) || null
    );
  }

  async save(cartItem: CartItem): Promise<CartItem> {
    if (cartItem.id === 0) {
      const newItem = new CartItem(
        this.currentId++,
        cartItem.userId,
        cartItem.productOptionId,
        cartItem.quantity,
        cartItem.createdAt,
        cartItem.updatedAt,
      );
      this.cartItems.set(newItem.id, newItem);
      return newItem;
    }

    this.cartItems.set(cartItem.id, cartItem);
    return cartItem;
  }

  async deleteById(id: number): Promise<void> {
    this.cartItems.delete(id);
  }
}
