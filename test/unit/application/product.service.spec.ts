import { ProductService } from '@application/product.service';
import {
  IProductRepository,
  IProductOptionRepository,
} from '@application/interfaces';
import { Product, ProductOption } from '@domain/product';
import { ProductPopularitySnapshot } from '@domain/product/product-popularity-snapshot.entity';
import { ErrorCode } from '@domain/common/constants/error-code';
import { DomainException } from '@domain/common/exceptions';

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockProductOptionRepository: jest.Mocked<IProductOptionRepository>;

  beforeEach(() => {
    // Mock Repositories
    mockProductRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      findTopProducts: jest.fn(),
    } as any;

    mockProductOptionRepository = {
      findById: jest.fn(),
      findByProductId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
    } as any;

    productService = new ProductService(
      mockProductRepository,
      mockProductOptionRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('판매 중인 상품 목록만 조회한다 (RF-001)', async () => {
      // given
      const availableProduct = new Product(
        1,
        '노트북',
        '고성능 노트북',
        1500000,
        'ELECTRONICS',
        true, // 판매 가능
        new Date(),
        new Date(),
      );
      const unavailableProduct = new Product(
        2,
        '단종 상품',
        '판매 중단',
        1000000,
        'ELECTRONICS',
        false, // 판매 불가
        new Date(),
        new Date(),
      );
      mockProductRepository.findAll.mockResolvedValue([
        availableProduct,
        unavailableProduct,
      ]);

      // when
      const result = await productService.getProducts();

      // then
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productId).toBe(1);
      expect(result.products[0].isAvailable).toBe(true);
      expect(mockProductRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('판매 중인 상품이 없으면 빈 배열을 반환한다', async () => {
      // given
      const unavailableProduct = new Product(
        1,
        '단종 상품',
        '판매 중단',
        1000000,
        'ELECTRONICS',
        false,
        new Date(),
        new Date(),
      );
      mockProductRepository.findAll.mockResolvedValue([unavailableProduct]);

      // when
      const result = await productService.getProducts();

      // then
      expect(result.products).toHaveLength(0);
    });

    it('전체 상품이 없으면 빈 배열을 반환한다', async () => {
      // given
      mockProductRepository.findAll.mockResolvedValue([]);

      // when
      const result = await productService.getProducts();

      // then
      expect(result.products).toEqual([]);
    });
  });

  describe('getProductDetail', () => {
    const productId = 1;

    it('상품이 존재하지 않으면 PRODUCT_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockProductRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(productService.getProductDetail(productId)).rejects.toThrow(
        DomainException,
      );

      try {
        await productService.getProductDetail(productId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.PRODUCT_NOT_FOUND,
        );
      }

      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(
        mockProductOptionRepository.findByProductId,
      ).not.toHaveBeenCalled();
    });

    it('상품 상세 정보와 재고 수량을 포함하여 조회한다 (RF-002)', async () => {
      // given
      const product = new Product(
        productId,
        '노트북',
        '고성능 게이밍 노트북',
        1500000,
        'ELECTRONICS',
        true,
        new Date(),
        new Date(),
      );
      mockProductRepository.findById.mockResolvedValue(product);

      const options = [
        new ProductOption(
          1,
          productId,
          'Black',
          '15inch',
          10, // 재고
          2, // 선점
          new Date(),
          new Date(),
        ),
        new ProductOption(
          2,
          productId,
          'White',
          '15inch',
          5, // 재고
          0, // 선점
          new Date(),
          new Date(),
        ),
      ];
      mockProductOptionRepository.findByProductId.mockResolvedValue(options);

      // when
      const result = await productService.getProductDetail(productId);

      // then
      expect(result.productId).toBe(productId);
      expect(result.name).toBe('노트북');
      expect(result.price).toBe(1500000);
      expect(result.description).toBe('고성능 게이밍 노트북');
      expect(result.category).toBe('ELECTRONICS');
      expect(result.isAvailable).toBe(true);
      expect(result.options).toHaveLength(2);
      expect(result.options[0].stock).toBe(8); // availableStock: 10 - 2
      expect(result.options[1].stock).toBe(5); // availableStock: 5 - 0
      expect(mockProductOptionRepository.findByProductId).toHaveBeenCalledWith(
        productId,
      );
    });

    it('옵션이 없는 상품도 조회할 수 있다', async () => {
      // given
      const product = new Product(
        productId,
        '디지털 상품',
        '다운로드 상품',
        50000,
        'DIGITAL',
        true,
        new Date(),
        new Date(),
      );
      mockProductRepository.findById.mockResolvedValue(product);
      mockProductOptionRepository.findByProductId.mockResolvedValue([]);

      // when
      const result = await productService.getProductDetail(productId);

      // then
      expect(result.productId).toBe(productId);
      expect(result.options).toHaveLength(0);
    });

    it('판매 중단된 상품도 상세 조회가 가능하다', async () => {
      // given
      const unavailableProduct = new Product(
        productId,
        '단종 상품',
        '판매 중단',
        1000000,
        'ELECTRONICS',
        false, // 판매 불가
        new Date(),
        new Date(),
      );
      mockProductRepository.findById.mockResolvedValue(unavailableProduct);
      mockProductOptionRepository.findByProductId.mockResolvedValue([]);

      // when
      const result = await productService.getProductDetail(productId);

      // then
      expect(result.isAvailable).toBe(false);
      expect(result.productId).toBe(productId);
    });
  });

  describe('getTopProducts', () => {
    it('최근 3일간 판매량 기준 상위 5개 상품을 조회한다 (RF-003)', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      const snapshots = [
        new ProductPopularitySnapshot(
          1,
          1,
          '베스트 상품 1',
          100000,
          'FASHION',
          1,
          150,
          now,
          now,
        ),
        new ProductPopularitySnapshot(
          2,
          2,
          '베스트 상품 2',
          200000,
          'ELECTRONICS',
          2,
          120,
          now,
          now,
        ),
        new ProductPopularitySnapshot(
          3,
          3,
          '베스트 상품 3',
          50000,
          'BOOKS',
          3,
          100,
          now,
          now,
        ),
        new ProductPopularitySnapshot(
          4,
          4,
          '베스트 상품 4',
          80000,
          'SPORTS',
          4,
          90,
          now,
          now,
        ),
        new ProductPopularitySnapshot(
          5,
          5,
          '베스트 상품 5',
          150000,
          'HOME',
          5,
          85,
          now,
          now,
        ),
      ];
      mockProductRepository.findTopProducts.mockResolvedValue(snapshots);

      // when
      const result = await productService.getTopProducts();

      // then
      expect(result.products).toHaveLength(5);
      expect(result.products[0].rank).toBe(1);
      expect(result.products[0].salesCount).toBe(150);
      expect(result.products[0].productId).toBe(1);
      expect(result.products[4].rank).toBe(5);
      expect(result.products[4].salesCount).toBe(85);
      expect(result.createdAt).toBeDefined();
      expect(mockProductRepository.findTopProducts).toHaveBeenCalledTimes(1);
    });

    it('인기 상품이 5개 미만이면 있는 만큼만 반환한다', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      const snapshots = [
        new ProductPopularitySnapshot(
          1,
          1,
          '상품 1',
          100000,
          'FASHION',
          1,
          50,
          now,
          now,
        ),
        new ProductPopularitySnapshot(
          2,
          2,
          '상품 2',
          200000,
          'ELECTRONICS',
          2,
          30,
          now,
          now,
        ),
      ];
      mockProductRepository.findTopProducts.mockResolvedValue(snapshots);

      // when
      const result = await productService.getTopProducts();

      // then
      expect(result.products).toHaveLength(2);
      expect(result.products[0].rank).toBe(1);
      expect(result.products[1].rank).toBe(2);
    });

    it('판매 데이터가 없으면 빈 배열을 반환한다', async () => {
      // given
      mockProductRepository.findTopProducts.mockResolvedValue([]);

      // when
      const result = await productService.getTopProducts();

      // then
      expect(result.products).toHaveLength(0);
      expect(result.createdAt).toBeDefined();
    });

    it('순위, 상품 정보, 판매 수량을 포함하여 반환한다', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      const lastSoldAt = new Date('2025-05-31T15:00:00Z');
      const snapshot = new ProductPopularitySnapshot(
        1,
        10,
        '인기 상품',
        150000,
        'ELECTRONICS',
        1,
        200,
        lastSoldAt,
        now,
      );
      mockProductRepository.findTopProducts.mockResolvedValue([snapshot]);

      // when
      const result = await productService.getTopProducts();

      // then
      expect(result.products[0]).toEqual({
        rank: 1,
        productId: 10,
        name: '인기 상품',
        price: 150000,
        category: 'ELECTRONICS',
        salesCount: 200,
        lastSoldAt: lastSoldAt,
      });
    });

    it('lastSoldAt이 null인 경우 현재 시간으로 설정한다', async () => {
      // given
      const now = new Date('2025-06-01T10:00:00Z');
      const snapshot = new ProductPopularitySnapshot(
        1,
        10,
        '상품',
        100000,
        'FASHION',
        1,
        50,
        null, // lastSoldAt이 null
        now,
      );
      mockProductRepository.findTopProducts.mockResolvedValue([snapshot]);

      // when
      const result = await productService.getTopProducts();

      // then
      expect(result.products[0].lastSoldAt).toBeInstanceOf(Date);
      expect(result.products[0].lastSoldAt).not.toBeNull();
    });
  });
});
