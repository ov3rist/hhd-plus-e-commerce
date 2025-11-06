/**
 * ProductPopularitySnapshot Entity
 * 인기 상품 캐시 (배치로 생성)
 */
export class ProductPopularitySnapshot {
  constructor(
    public readonly id: number,
    public readonly productId: number,
    public readonly productName: string,
    public readonly price: number,
    public readonly category: string,
    public readonly rank: number,
    public readonly salesCount: number,
    public readonly lastSoldAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
