import { Injectable } from '@nestjs/common';
import {
  IProductRepository,
  IProductOptionRepository,
} from '@application/interfaces';
import { Product } from '@domain/product/product.entity';
import { ProductOption } from '@domain/product/product-option.entity';

/**
 * Product Repository Implementation (In-Memory)
 */
@Injectable()
export class ProductRepository implements IProductRepository {
  private products: Map<number, Product> = new Map();
  private currentId = 1;

  async findById(id: number): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async findByIds(ids: number[]): Promise<Product[]> {
    return ids
      .map((id) => this.products.get(id))
      .filter((p): p is Product => p !== undefined);
  }

  async save(product: Product): Promise<Product> {
    if (product.id === 0) {
      const newProduct = new Product(
        this.currentId++,
        product.name,
        product.description,
        product.price,
        product.category,
        product.isAvailable,
        product.createdAt,
        product.updatedAt,
      );
      this.products.set(newProduct.id, newProduct);
      return newProduct;
    }

    this.products.set(product.id, product);
    return product;
  }
}

/**
 * ProductOption Repository Implementation (In-Memory)
 */
@Injectable()
export class ProductOptionRepository implements IProductOptionRepository {
  private productOptions: Map<number, ProductOption> = new Map();
  private currentId = 1;

  async findById(id: number): Promise<ProductOption | null> {
    return this.productOptions.get(id) || null;
  }

  async findByProductId(productId: number): Promise<ProductOption[]> {
    return Array.from(this.productOptions.values()).filter(
      (option) => option.productId === productId,
    );
  }

  async findByIds(ids: number[]): Promise<ProductOption[]> {
    return ids
      .map((id) => this.productOptions.get(id))
      .filter((po): po is ProductOption => po !== undefined);
  }

  async save(productOption: ProductOption): Promise<ProductOption> {
    if (productOption.id === 0) {
      const newOption = new ProductOption(
        this.currentId++,
        productOption.productId,
        productOption.color,
        productOption.size,
        productOption.stock,
        productOption.reservedStock,
        productOption.createdAt,
        productOption.updatedAt,
      );
      this.productOptions.set(newOption.id, newOption);
      return newOption;
    }

    this.productOptions.set(productOption.id, productOption);
    return productOption;
  }
}
