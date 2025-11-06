import { CouponService } from '@application/coupon.service';
import {
  ICouponRepository,
  IUserCouponRepository,
} from '@application/interfaces';
import { Coupon, UserCoupon } from '@domain/coupon';
import { ErrorCode } from '@domain/common/constants/error-code';
import { DomainException } from '@domain/common/exceptions';

describe('CouponService', () => {
  let couponService: CouponService;
  let mockCouponRepository: jest.Mocked<ICouponRepository>;
  let mockUserCouponRepository: jest.Mocked<IUserCouponRepository>;

  beforeEach(() => {
    jest.useFakeTimers();

    // Mock Repository 생성
    mockCouponRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    } as any;

    mockUserCouponRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndCouponId: jest.fn(),
      save: jest.fn(),
    } as any;

    couponService = new CouponService(
      mockCouponRepository,
      mockUserCouponRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('issueCoupon', () => {
    const userId = 1;
    const couponId = 10;

    it('쿠폰이 존재하지 않으면 COUPON_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockCouponRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(couponService.issueCoupon(userId, couponId)).rejects.toThrow(
        DomainException,
      );

      try {
        await couponService.issueCoupon(userId, couponId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.COUPON_NOT_FOUND,
        );
      }

      expect(mockCouponRepository.findById).toHaveBeenCalledWith(couponId);
      expect(
        mockUserCouponRepository.findByUserIdAndCouponId,
      ).not.toHaveBeenCalled();
    });

    it('이미 발급받은 쿠폰이면 ALREADY_ISSUED 예외를 던진다 (BR-006)', async () => {
      // given
      const now = new Date('2025-06-01');
      jest.setSystemTime(now);

      const coupon = new Coupon(
        couponId,
        '신규 가입 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date(),
        new Date(),
      );
      mockCouponRepository.findById.mockResolvedValue(coupon);

      const existingUserCoupon = new UserCoupon(
        1,
        userId,
        couponId,
        null,
        new Date(),
        null,
        new Date('2025-12-31'),
        new Date(),
      );
      mockUserCouponRepository.findByUserIdAndCouponId.mockResolvedValue(
        existingUserCoupon,
      );

      // when & then
      await expect(couponService.issueCoupon(userId, couponId)).rejects.toThrow(
        DomainException,
      );

      try {
        await couponService.issueCoupon(userId, couponId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.ALREADY_ISSUED,
        );
      }

      expect(mockCouponRepository.save).not.toHaveBeenCalled();
    });

    it('쿠폰이 만료되었으면 EXPIRED_COUPON 예외를 던진다', async () => {
      // given
      const now = new Date('2026-01-01'); // 만료일 이후
      jest.setSystemTime(now);

      const expiredCoupon = new Coupon(
        couponId,
        '만료된 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'), // 만료일
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );
      mockCouponRepository.findById.mockResolvedValue(expiredCoupon);
      mockUserCouponRepository.findByUserIdAndCouponId.mockResolvedValue(null);

      // when & then
      await expect(couponService.issueCoupon(userId, couponId)).rejects.toThrow(
        DomainException,
      );

      try {
        await couponService.issueCoupon(userId, couponId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.EXPIRED_COUPON,
        );
      }
    });

    it('쿠폰이 품절되었으면 COUPON_SOLD_OUT 예외를 던진다 (NFR-010)', async () => {
      // given
      const now = new Date('2025-06-01');
      jest.setSystemTime(now);

      const soldOutCoupon = new Coupon(
        couponId,
        '품절 쿠폰',
        10,
        100,
        100, // 발급 완료
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );
      mockCouponRepository.findById.mockResolvedValue(soldOutCoupon);
      mockUserCouponRepository.findByUserIdAndCouponId.mockResolvedValue(null);

      // when & then
      await expect(couponService.issueCoupon(userId, couponId)).rejects.toThrow(
        DomainException,
      );

      try {
        await couponService.issueCoupon(userId, couponId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.COUPON_SOLD_OUT,
        );
      }
    });

    it('쿠폰을 성공적으로 발급하고 발급 정보를 반환한다', async () => {
      // given
      const now = new Date('2025-06-01');
      jest.setSystemTime(now);

      const coupon = new Coupon(
        couponId,
        '신규 가입 쿠폰',
        15, // 15% 할인
        100,
        50, // 50개 발급됨
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );
      mockCouponRepository.findById.mockResolvedValue(coupon);
      mockUserCouponRepository.findByUserIdAndCouponId.mockResolvedValue(null);

      const savedCoupon = new Coupon(
        couponId,
        '신규 가입 쿠폰',
        15,
        100,
        51, // 발급 수량 증가
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        now,
      );
      mockCouponRepository.save.mockResolvedValue(savedCoupon);

      const savedUserCoupon = new UserCoupon(
        1, // userCouponId
        userId,
        couponId,
        null,
        now,
        null,
        new Date('2025-12-31'),
        now,
      );
      mockUserCouponRepository.save.mockResolvedValue(savedUserCoupon);

      // when
      const result = await couponService.issueCoupon(userId, couponId);

      // then
      expect(result).toEqual({
        userCouponId: 1,
        couponName: '신규 가입 쿠폰',
        discountRate: 15,
        expiresAt: new Date('2025-12-31'),
        remainingQuantity: 49, // 100 - 51
      });
      expect(coupon.issuedQuantity).toBe(51); // 발급 수량 증가 확인
      expect(mockCouponRepository.save).toHaveBeenCalledWith(coupon);
      expect(mockUserCouponRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          couponId,
          usedAt: null,
        }),
      );
    });
  });

  describe('getUserCoupons', () => {
    const userId = 1;

    it('보유한 쿠폰이 없으면 빈 배열을 반환한다', async () => {
      // given
      mockUserCouponRepository.findByUserId.mockResolvedValue([]);

      // when
      const result = await couponService.getUserCoupons(userId);

      // then
      expect(result).toEqual({ coupons: [] });
      expect(mockUserCouponRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('보유한 쿠폰 목록을 조회하고 쿠폰 정보를 포함한다', async () => {
      // given
      const now = new Date('2025-06-01');
      jest.setSystemTime(now);

      const userCoupon1 = new UserCoupon(
        1,
        userId,
        10,
        null,
        new Date('2025-05-01'),
        null,
        new Date('2025-12-31'),
        new Date('2025-05-01'),
      );
      const userCoupon2 = new UserCoupon(
        2,
        userId,
        20,
        100,
        new Date('2025-04-01'),
        new Date('2025-05-15'),
        new Date('2025-12-31'),
        new Date('2025-05-15'),
      );
      mockUserCouponRepository.findByUserId.mockResolvedValue([
        userCoupon1,
        userCoupon2,
      ]);

      const coupon1 = new Coupon(
        10,
        '신규 가입 쿠폰',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );
      const coupon2 = new Coupon(
        20,
        'VIP 쿠폰',
        20,
        50,
        30,
        new Date('2025-12-31'),
        new Date('2025-01-01'),
        new Date('2025-01-01'),
      );

      mockCouponRepository.findById
        .mockResolvedValueOnce(coupon1)
        .mockResolvedValueOnce(coupon2);

      // when
      const result = await couponService.getUserCoupons(userId);

      // then
      expect(result.coupons).toHaveLength(2);
      expect(result.coupons[0]).toEqual({
        userCouponId: 1,
        couponId: 10,
        couponName: '신규 가입 쿠폰',
        discountRate: 10,
        status: 'AVAILABLE',
        expiresAt: new Date('2025-12-31'),
        issuedAt: new Date('2025-05-01'),
        usedAt: null,
      });
      expect(result.coupons[1]).toEqual({
        userCouponId: 2,
        couponId: 20,
        couponName: 'VIP 쿠폰',
        discountRate: 20,
        status: 'USED',
        expiresAt: new Date('2025-12-31'),
        issuedAt: new Date('2025-04-01'),
        usedAt: new Date('2025-05-15'),
      });
    });

    it('상태 필터로 쿠폰을 조회할 수 있다', async () => {
      // given
      const now = new Date('2025-06-01');
      jest.setSystemTime(now);

      const availableCoupon = new UserCoupon(
        1,
        userId,
        10,
        null,
        new Date('2025-05-01'),
        null,
        new Date('2025-12-31'),
        new Date('2025-05-01'),
      );
      const usedCoupon = new UserCoupon(
        2,
        userId,
        20,
        100,
        new Date('2025-04-01'),
        new Date('2025-05-15'),
        new Date('2025-12-31'),
        new Date('2025-05-15'),
      );
      const expiredCoupon = new UserCoupon(
        3,
        userId,
        30,
        null,
        new Date('2025-01-01'),
        null,
        new Date('2025-05-31'), // 만료됨
        new Date('2025-01-01'),
      );
      mockUserCouponRepository.findByUserId.mockResolvedValue([
        availableCoupon,
        usedCoupon,
        expiredCoupon,
      ]);

      const coupon1 = new Coupon(
        10,
        '쿠폰1',
        10,
        100,
        50,
        new Date('2025-12-31'),
        new Date(),
        new Date(),
      );
      mockCouponRepository.findById.mockResolvedValue(coupon1);

      // when: AVAILABLE 상태만 조회
      const result = await couponService.getUserCoupons(userId, 'AVAILABLE');

      // then
      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0].status).toBe('AVAILABLE');
      expect(result.coupons[0].userCouponId).toBe(1);
    });

    it('쿠폰 정보를 찾을 수 없으면 COUPON_INFO_NOT_FOUND 예외를 던진다', async () => {
      // given
      const userCoupon = new UserCoupon(
        1,
        userId,
        10,
        null,
        new Date(),
        null,
        new Date('2025-12-31'),
        new Date(),
      );
      mockUserCouponRepository.findByUserId.mockResolvedValue([userCoupon]);
      mockCouponRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(couponService.getUserCoupons(userId)).rejects.toThrow(
        DomainException,
      );

      try {
        await couponService.getUserCoupons(userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.COUPON_INFO_NOT_FOUND,
        );
      }
    });
  });
});
