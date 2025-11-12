import { Injectable } from '@nestjs/common';
import {
  ICartRepository,
  IProductOptionRepository,
  IProductRepository,
} from '@domain/interfaces';
import { CartItem } from './cart-item.entity';
import { Product } from '@domain/product/product.entity';
import { ProductOption } from '@domain/product/product-option.entity';
import { DomainException } from '@domain/common/exceptions';
import { ErrorCode } from '@domain/common/constants/error-code';

export interface CartViewItem {
  cartItem: CartItem;
  productOption: ProductOption;
  product: Product;
  subtotal: number;
}

export interface CartView {
  items: CartViewItem[];
  totalAmount: number;
}

/**
 * CartDomainService
 * 장바구니 관련 핵심 비즈니스 로직을 담당한다.
 */
@Injectable()
export class CartDomainService {
  constructor(
    private readonly cartRepository: ICartRepository,
    private readonly productRepository: IProductRepository,
    private readonly productOptionRepository: IProductOptionRepository,
  ) {}

  /**
   * 상품 옵션 로드 (없으면 예외)
   */
  async loadProductOptionOrFail(
    productOptionId: number,
  ): Promise<ProductOption> {
    const productOption =
      await this.productOptionRepository.findById(productOptionId);
    if (!productOption) {
      throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }
    return productOption;
  }

  /**
   * 가용 재고 검증
   */
  ensureStockAvailable(option: ProductOption, quantity: number): void {
    if (option.availableStock < quantity) {
      throw new DomainException(ErrorCode.INSUFFICIENT_STOCK);
    }
  }

  /**
   * 장바구니 항목 추가 또는 수량 증가
   */
  async upsertCartItem(
    userId: number,
    productOption: ProductOption,
    quantity: number,
  ): Promise<CartItem> {
    const existingItem =
      await this.cartRepository.findByUserIdAndProductOptionId(
        userId,
        productOption.id,
      );

    if (existingItem) {
      existingItem.updateQuantity(existingItem.quantity + quantity);
      return this.cartRepository.save(existingItem);
    }

    const now = new Date();
    const cartItem = new CartItem(
      0,
      userId,
      productOption.id,
      quantity,
      now,
      now,
    );
    return this.cartRepository.save(cartItem);
  }

  /**
   * 장바구니 조회 뷰 생성
   */
  async buildCartView(userId: number): Promise<CartView> {
    const cartItems = await this.cartRepository.findByUserId(userId);
    if (cartItems.length === 0) {
      return { items: [], totalAmount: 0 };
    }

    const productOptionIds = Array.from(
      new Set(cartItems.map((item) => item.productOptionId)),
    );
    const productOptions =
      await this.productOptionRepository.findByIds(productOptionIds);
    const productOptionMap = new Map(
      productOptions.map((option) => [option.id, option] as const),
    );

    const productIds = Array.from(
      new Set(productOptions.map((option) => option.productId)),
    );
    const products = await this.productRepository.findByIds(productIds);
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const items: CartViewItem[] = cartItems.map((cartItem) => {
      const productOption = this.requireProductOption(
        productOptionMap,
        cartItem.productOptionId,
      );
      const product = this.requireProduct(productMap, productOption.productId);
      const subtotal = product.price * cartItem.quantity;

      return {
        cartItem,
        productOption,
        product,
        subtotal,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    return { items, totalAmount };
  }

  /**
   * 장바구니 항목 로드 (없으면 예외)
   */
  async loadCartItemOrFail(cartItemId: number): Promise<CartItem> {
    const cartItem = await this.cartRepository.findById(cartItemId);
    if (!cartItem) {
      throw new DomainException(ErrorCode.CART_ITEM_NOT_FOUND);
    }
    return cartItem;
  }

  /**
   * 장바구니 항목 소유자 검증
   */
  ensureItemBelongsToUser(cartItem: CartItem, userId: number): void {
    if (cartItem.userId !== userId) {
      throw new DomainException(ErrorCode.UNAUTHORIZED_CART_ACCESS);
    }
  }

  /**
   * 장바구니 항목 삭제
   */
  async removeCartItem(cartItemId: number): Promise<void> {
    await this.cartRepository.deleteById(cartItemId);
  }

  private requireProductOption(
    optionMap: Map<number, ProductOption>,
    optionId: number,
  ): ProductOption {
    const option = optionMap.get(optionId);
    if (!option) {
      throw new DomainException(ErrorCode.PRODUCT_OPTION_NOT_FOUND);
    }
    return option;
  }

  private requireProduct(
    productMap: Map<number, Product>,
    productId: number,
  ): Product {
    const product = productMap.get(productId);
    if (!product) {
      throw new DomainException(ErrorCode.PRODUCT_NOT_FOUND);
    }
    return product;
  }
}
