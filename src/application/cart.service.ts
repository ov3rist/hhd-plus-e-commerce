import { Injectable } from '@nestjs/common';
import {
  ICartRepository,
  IProductRepository,
  IProductOptionRepository,
} from './interfaces';
import { CartItem } from '@domain/cart/cart-item.entity';
import {
  AddToCartResponseDto,
  GetCartResponseDto,
  CartItemDto,
} from '@presentation/cart/dto';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

/**
 * Cart Service
 * 장바구니 관리 유스케이스
 */
@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
  ) {}

  /**
   * 장바구니 상품 추가 (US-005)
   * 재고를 검증하고 장바구니에 추가하거나 수량 증가
   */
  async addToCart(
    userId: number,
    productOptionId: number,
    quantity: number,
  ): Promise<AddToCartResponseDto> {
    // 상품 옵션 확인 및 재고 검증
    const productOption =
      await this.productOptionRepository.findById(productOptionId);
    if (!productOption) {
      throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }

    if (productOption.availableStock < quantity) {
      throw new DomainException(ErrorCode.INSUFFICIENT_STOCK);
    }

    // 기존 장바구니 항목 확인
    const existingItem =
      await this.cartRepository.findByUserIdAndProductOptionId(
        userId,
        productOptionId,
      );

    let savedItem: CartItem;

    if (existingItem) {
      // 기존 항목이 있으면 수량 증가
      existingItem.updateQuantity(existingItem.quantity + quantity);
      savedItem = await this.cartRepository.save(existingItem);
    } else {
      // 새 항목 생성
      const cartItem = new CartItem(
        0,
        userId,
        productOptionId,
        quantity,
        new Date(),
        new Date(),
      );
      savedItem = await this.cartRepository.save(cartItem);
    }

    return {
      cartItemId: savedItem.id,
      productOptionId: savedItem.productOptionId,
      quantity: savedItem.quantity,
    };
  }

  /**
   * 장바구니 조회 (US-006)
   */
  async getCart(userId: number): Promise<GetCartResponseDto> {
    const cartItems = await this.cartRepository.findByUserId(userId);

    const items: CartItemDto[] = await Promise.all(
      cartItems.map(async (cartItem) => {
        const productOption = await this.productOptionRepository.findById(
          cartItem.productOptionId,
        );
        if (!productOption) {
          throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
        }

        const product = await this.productRepository.findById(
          productOption.productId,
        );
        if (!product) {
          throw new DomainException(ErrorCode.PRODUCT_NOT_FOUND);
        }

        const subtotal = product.price * cartItem.quantity;

        return {
          cartItemId: cartItem.id,
          productId: product.id,
          productName: product.name,
          productOptionId: productOption.id,
          optionColor: productOption.color,
          optionSize: productOption.size,
          price: product.price,
          quantity: cartItem.quantity,
          subtotal,
        };
      }),
    );

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      items,
      totalAmount,
    };
  }

  /**
   * 장바구니 상품 삭제 (US-007)
   */
  async removeFromCart(userId: number, cartItemId: number): Promise<void> {
    const cartItem = await this.cartRepository.findById(cartItemId);
    if (!cartItem) {
      throw new DomainException(ErrorCode.CART_ITEM_NOT_FOUND);
    }

    if (cartItem.userId !== userId) {
      throw new DomainException(ErrorCode.UNAUTHORIZED_CART_ACCESS);
    }

    await this.cartRepository.deleteById(cartItemId);
  }
}
