import { Injectable } from '@nestjs/common';
import { ICartRepository } from '@domain/interfaces';
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

  async findManyByUserId(userId: number): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      (item) => item.userId === userId,
    );
  }

  async create(cartItem: CartItem): Promise<CartItem> {
    const newCartItem = new CartItem(
      this.currentId++,
      cartItem.userId,
      cartItem.productOptionId,
      cartItem.quantity,
      new Date(),
      new Date(),
    );
    this.cartItems.set(newCartItem.id, newCartItem);
    return newCartItem;
  }

  async update(cartItem: CartItem): Promise<CartItem> {
    this.cartItems.set(cartItem.id, cartItem);
    return cartItem;
  }

  async deleteByUserCart(
    userId: number,
    productOptionId: number,
  ): Promise<void> {
    for (const [id, item] of this.cartItems) {
      if (item.userId === userId && item.productOptionId === productOptionId) {
        this.cartItems.delete(id);
      }
    }
  }
}
