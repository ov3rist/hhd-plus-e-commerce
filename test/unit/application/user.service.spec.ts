import { UserDomainService } from '@domain/user/user.service';
import {
  IUserRepository,
  IUserBalanceChangeLogRepository,
} from '@domain/interfaces';
import { User } from '@domain/user';
import {
  UserBalanceChangeLog,
  BalanceChangeCode,
} from '@domain/user/user-balance-change-log.entity';
import { ErrorCode } from '@domain/common/constants/error-code';
import { DomainException } from '@domain/common/exceptions';

describe('UserDomainService', () => {
  let userService: UserDomainService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockBalanceLogRepository: jest.Mocked<IUserBalanceChangeLogRepository>;

  beforeEach(() => {
    // Mock Repositories
    mockUserRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;

    mockBalanceLogRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
    } as any;

    userService = new UserDomainService(
      mockUserRepository,
      mockBalanceLogRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    const userId = 1;

    it('사용자가 존재하지 않으면 USER_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockUserRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(userService.getBalance(userId)).rejects.toThrow(
        DomainException,
      );

      try {
        await userService.getBalance(userId);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.USER_NOT_FOUND,
        );
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('사용자의 잔액을 조회한다 (RF-004)', async () => {
      // given
      const user = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      // when
      const result = await userService.getBalance(userId);

      // then
      expect(result.userId).toBe(userId);
      expect(result.balance).toBe(50000);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('잔액이 0인 사용자도 조회할 수 있다', async () => {
      // given
      const user = new User(userId, 0, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      // when
      const result = await userService.getBalance(userId);

      // then
      expect(result.balance).toBe(0);
    });
  });

  describe('getBalanceLogs', () => {
    const userId = 1;

    it('사용자가 존재하지 않으면 USER_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockUserRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(userService.getBalanceLogs(userId, {})).rejects.toThrow(
        DomainException,
      );

      try {
        await userService.getBalanceLogs(userId, {});
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.USER_NOT_FOUND,
        );
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(
        mockBalanceLogRepository.findByUserIdWithFilter,
      ).not.toHaveBeenCalled();
    });

    it('잔액 변경 이력을 조회한다 (RF-022)', async () => {
      // given
      const user = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const now = new Date('2025-06-01T10:00:00Z');
      const logs = [
        new UserBalanceChangeLog(
          1,
          userId,
          50000,
          0,
          50000,
          BalanceChangeCode.SYSTEM_CHARGE,
          '초기 충전',
          null,
          now,
        ),
        new UserBalanceChangeLog(
          2,
          userId,
          -10000,
          50000,
          40000,
          BalanceChangeCode.PAYMENT,
          '주문 결제',
          100,
          now,
        ),
      ];

      mockBalanceLogRepository.findByUserIdWithFilter.mockResolvedValue({
        logs,
        total: 2,
      });

      // when
      const result = await userService.getBalanceLogs(userId, {});

      // then
      expect(result.logs).toHaveLength(2);
      expect(result.logs[0].amount).toBe(50000);
      expect(result.logs[0].code).toBe(BalanceChangeCode.SYSTEM_CHARGE);
      expect(result.logs[1].amount).toBe(-10000);
      expect(result.logs[1].code).toBe(BalanceChangeCode.PAYMENT);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1); // 기본값
      expect(result.size).toBe(20); // 기본값
      expect(
        mockBalanceLogRepository.findByUserIdWithFilter,
      ).toHaveBeenCalledWith(userId, {});
    });

    it('기간 필터로 이력을 조회할 수 있다 (RF-022)', async () => {
      // given
      const user = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const from = new Date('2025-06-01');
      const to = new Date('2025-06-30');
      const filter = { from, to };

      mockBalanceLogRepository.findByUserIdWithFilter.mockResolvedValue({
        logs: [],
        total: 0,
      });

      // when
      await userService.getBalanceLogs(userId, filter);

      // then
      expect(
        mockBalanceLogRepository.findByUserIdWithFilter,
      ).toHaveBeenCalledWith(userId, filter);
    });

    it('변경 유형(code)으로 필터링할 수 있다 (RF-022)', async () => {
      // given
      const user = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const now = new Date('2025-06-01T10:00:00Z');
      const paymentLog = new UserBalanceChangeLog(
        1,
        userId,
        -10000,
        50000,
        40000,
        BalanceChangeCode.PAYMENT,
        '주문 결제',
        100,
        now,
      );

      mockBalanceLogRepository.findByUserIdWithFilter.mockResolvedValue({
        logs: [paymentLog],
        total: 1,
      });

      // when
      const result = await userService.getBalanceLogs(userId, {
        code: BalanceChangeCode.PAYMENT,
      });

      // then
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].code).toBe(BalanceChangeCode.PAYMENT);
      expect(
        mockBalanceLogRepository.findByUserIdWithFilter,
      ).toHaveBeenCalledWith(userId, { code: BalanceChangeCode.PAYMENT });
    });

    it('ref_id로 필터링할 수 있다 (RF-022)', async () => {
      // given
      const user = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const orderId = 100;
      const now = new Date('2025-06-01T10:00:00Z');
      const log = new UserBalanceChangeLog(
        1,
        userId,
        -10000,
        50000,
        40000,
        BalanceChangeCode.PAYMENT,
        '주문 결제',
        orderId,
        now,
      );

      mockBalanceLogRepository.findByUserIdWithFilter.mockResolvedValue({
        logs: [log],
        total: 1,
      });

      // when
      const result = await userService.getBalanceLogs(userId, {
        refId: orderId,
      });

      // then
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].refId).toBe(orderId);
      expect(
        mockBalanceLogRepository.findByUserIdWithFilter,
      ).toHaveBeenCalledWith(userId, { refId: orderId });
    });

    it('페이지네이션을 지원한다 (RF-022)', async () => {
      // given
      const user = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const now = new Date('2025-06-01T10:00:00Z');
      const logs = Array.from(
        { length: 10 },
        (_, i) =>
          new UserBalanceChangeLog(
            i + 1,
            userId,
            1000,
            0,
            1000,
            BalanceChangeCode.SYSTEM_CHARGE,
            null,
            null,
            now,
          ),
      );

      mockBalanceLogRepository.findByUserIdWithFilter.mockResolvedValue({
        logs,
        total: 50, // 전체 50개
      });

      // when
      const result = await userService.getBalanceLogs(userId, {
        page: 2,
        size: 10,
      });

      // then
      expect(result.page).toBe(2);
      expect(result.size).toBe(10);
      expect(result.total).toBe(50);
      expect(result.logs).toHaveLength(10);
      expect(
        mockBalanceLogRepository.findByUserIdWithFilter,
      ).toHaveBeenCalledWith(userId, { page: 2, size: 10 });
    });

    it('잔액 변경 이력이 없으면 빈 배열을 반환한다', async () => {
      // given
      const user = new User(userId, 0, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      mockBalanceLogRepository.findByUserIdWithFilter.mockResolvedValue({
        logs: [],
        total: 0,
      });

      // when
      const result = await userService.getBalanceLogs(userId, {});

      // then
      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('chargeBalance', () => {
    const userId = 1;

    it('사용자가 존재하지 않으면 USER_NOT_FOUND 예외를 던진다', async () => {
      // given
      mockUserRepository.findById.mockResolvedValue(null);

      // when & then
      await expect(userService.chargeBalance(userId, 10000)).rejects.toThrow(
        DomainException,
      );

      try {
        await userService.chargeBalance(userId, 10000);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.USER_NOT_FOUND,
        );
      }

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('잔액을 충전하고 로그를 기록한다 (RF-021)', async () => {
      // given
      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const chargedUser = new User(userId, 60000, new Date(), new Date());
      mockUserRepository.save.mockResolvedValue(chargedUser);

      const log = new UserBalanceChangeLog(
        1,
        userId,
        50000,
        10000,
        60000,
        BalanceChangeCode.SYSTEM_CHARGE,
        '관리자 잔액 충전',
        null,
        new Date(),
      );
      mockBalanceLogRepository.save.mockResolvedValue(log);

      // when
      const result = await userService.chargeBalance(userId, 50000);

      // then
      expect(result.user.balance).toBe(60000);
      expect(result.log.amount).toBe(50000);
      expect(result.log.beforeAmount).toBe(10000);
      expect(result.log.afterAmount).toBe(60000);
      expect(result.log.code).toBe(BalanceChangeCode.SYSTEM_CHARGE);
      expect(mockUserRepository.save).toHaveBeenCalledWith(user);
      expect(mockBalanceLogRepository.save).toHaveBeenCalled();
    });

    it('0원 잔액에서도 충전할 수 있다', async () => {
      // given
      const user = new User(userId, 0, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const chargedUser = new User(userId, 50000, new Date(), new Date());
      mockUserRepository.save.mockResolvedValue(chargedUser);

      const log = new UserBalanceChangeLog(
        1,
        userId,
        50000,
        0,
        50000,
        BalanceChangeCode.SYSTEM_CHARGE,
        '관리자 잔액 충전',
        null,
        new Date(),
      );
      mockBalanceLogRepository.save.mockResolvedValue(log);

      // when
      const result = await userService.chargeBalance(userId, 50000);

      // then
      expect(result.user.balance).toBe(50000);
      expect(result.log.beforeAmount).toBe(0);
      expect(result.log.afterAmount).toBe(50000);
    });

    it('잔액 충전 시 도메인 로직을 통해 검증한다', async () => {
      // given
      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      // when & then: 도메인에서 0 이하 금액 검증
      await expect(userService.chargeBalance(userId, 0)).rejects.toThrow();
      await expect(userService.chargeBalance(userId, -1000)).rejects.toThrow();
    });

    it('원자적으로 잔액 업데이트와 로그 기록을 수행한다 (NFR-013)', async () => {
      // given
      const user = new User(userId, 10000, new Date(), new Date());
      mockUserRepository.findById.mockResolvedValue(user);

      const chargedUser = new User(userId, 60000, new Date(), new Date());
      mockUserRepository.save.mockResolvedValue(chargedUser);

      const log = new UserBalanceChangeLog(
        1,
        userId,
        50000,
        10000,
        60000,
        BalanceChangeCode.SYSTEM_CHARGE,
        '관리자 잔액 충전',
        null,
        new Date(),
      );
      mockBalanceLogRepository.save.mockResolvedValue(log);

      // when
      await userService.chargeBalance(userId, 50000);

      // then: save 호출 순서 검증 (user -> log)
      const saveCallOrder = mockUserRepository.save.mock.invocationCallOrder[0];
      const logSaveCallOrder =
        mockBalanceLogRepository.save.mock.invocationCallOrder[0];
      expect(saveCallOrder).toBeLessThan(logSaveCallOrder);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockBalanceLogRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
