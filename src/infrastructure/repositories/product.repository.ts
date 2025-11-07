import { Injectable } from '@nestjs/common';
import {
  IProductRepository,
  IProductOptionRepository,
} from '@application/interfaces';
import { Product } from '@domain/product/product.entity';
import { ProductOption } from '@domain/product/product-option.entity';
import { ProductPopularitySnapshot } from '@domain/product/product-popularity-snapshot.entity';
import { MutexManager } from '@infrastructure/common/mutex-manager';

/**
 * Product Repository Implementation (In-Memory)
 */
@Injectable()
export class ProductRepository implements IProductRepository {
  private products: Map<number, Product> = new Map();
  public snapshots: Map<number, ProductPopularitySnapshot> = new Map();
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

  async findTopProducts(): Promise<ProductPopularitySnapshot[]> {
    // 스냅샷이 없으면 빈 배열 반환
    if (this.snapshots.size === 0) {
      return [];
    }

    // 가장 최신 스냅샷의 생성 시간 찾기
    const allSnapshots = Array.from(this.snapshots.values());
    const latestCreatedAt = allSnapshots.reduce(
      (max, s) => (s.createdAt > max ? s.createdAt : max),
      allSnapshots[0].createdAt,
    );

    // 가장 최신 스냅샷만 추출하여 rank 순으로 정렬하여 반환
    // (스케줄러가 이미 최근 N일 판매량 기준으로 Top M개를 계산하여 저장)
    return allSnapshots
      .filter((s) => s.createdAt.getTime() === latestCreatedAt.getTime())
      .sort((a, b) => a.rank - b.rank);
  }

  async saveSnapshot(snapshot: ProductPopularitySnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot);
  }
}

/**
 * ProductOption Repository Implementation (In-Memory)
 * 동시성 제어: 상품 옵션별 재고 변경 시 Mutex를 통한 직렬화 보장
 */
@Injectable()
export class ProductOptionRepository implements IProductOptionRepository {
  private productOptions: Map<number, ProductOption> = new Map();
  private currentId = 1;
  private readonly mutexManager = new MutexManager();

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
    const optionId = productOption.id || 0;
    const unlock = await this.mutexManager.acquire(optionId);

    try {
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
    } finally {
      unlock();
    }
  }
}
