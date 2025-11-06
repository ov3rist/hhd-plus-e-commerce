import { User } from '@domain/user';
import {
  UserBalanceChangeLog,
  BalanceChangeCode,
} from '@domain/user/user-balance-change-log.entity';
import { ErrorCode } from '@domain/common/constants/error-code';
import {
  DomainException,
  ValidationException,
} from '@domain/common/exceptions';

describe('User Entity', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const validUserData = {
    id: 1,
    balance: 10000,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('생성자', () => {
    it('유효한 데이터와 잔액 0으로 User를 생성할 수 있다', () => {
      // when
      const user1 = new User(
        validUserData.id,
        validUserData.balance,
        validUserData.createdAt,
        validUserData.updatedAt,
      );
      const user2 = new User(
        validUserData.id,
        0,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // then
      expect(user1.id).toBe(validUserData.id);
      expect(user1.balance).toBe(validUserData.balance);
      expect(user1.createdAt).toEqual(validUserData.createdAt);
      expect(user1.updatedAt).toEqual(validUserData.updatedAt);
      expect(user2.balance).toBe(0);
    });

    it('잔액이 음수이면 ValidationException을 던진다', () => {
      // when & then
      expect(() => {
        new User(
          validUserData.id,
          -1000,
          validUserData.createdAt,
          validUserData.updatedAt,
        );
      }).toThrow('잔액은 0 이상이어야 합니다');
    });
  });

  describe('charge (잔액 충전)', () => {
    it('충전 금액만큼 잔액을 증가시키고 로그를 반환한다 (RF-021, BR-021)', () => {
      // given
      const now = new Date('2025-01-15T10:00:00Z');
      jest.setSystemTime(now);

      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.charge(5000, '충전 테스트');

      // then
      expect(user.balance).toBe(15000); // 10000 + 5000
      expect(user.updatedAt).toEqual(now);
      expect(log).toBeInstanceOf(UserBalanceChangeLog);
      expect(log.userId).toBe(user.id);
      expect(log.amount).toBe(5000); // 양수
      expect(log.beforeAmount).toBe(10000);
      expect(log.afterAmount).toBe(15000);
      expect(log.code).toBe(BalanceChangeCode.SYSTEM_CHARGE);
      expect(log.note).toBe('충전 테스트');
      expect(log.refId).toBeNull();
    });

    it('note 없이 충전할 수 있다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.charge(5000);

      // then
      expect(user.balance).toBe(15000);
      expect(log.note).toBeNull();
    });

    it('refId를 지정하여 충전할 수 있다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.charge(5000, '충전', 999);

      // then
      expect(user.balance).toBe(15000);
      expect(log.refId).toBe(999);
    });

    it('충전 금액이 0 이하이면 ValidationException을 던진다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when & then
      expect(() => user.charge(0)).toThrow(ValidationException);
      expect(() => user.charge(0)).toThrow('충전 금액은 0보다 커야 합니다');
      expect(() => user.charge(-1000)).toThrow(ValidationException);
      expect(() => user.charge(-1000)).toThrow('충전 금액은 0보다 커야 합니다');
    });
  });

  describe('deduct (잔액 차감)', () => {
    it('차감 금액만큼 잔액을 감소시키고 로그를 반환한다 (RF-021, BR-021)', () => {
      // given
      const now = new Date('2025-01-15T10:00:00Z');
      jest.setSystemTime(now);

      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.deduct(3000, '결제 차감', 100);

      // then
      expect(user.balance).toBe(7000); // 10000 - 3000
      expect(user.updatedAt).toEqual(now);
      expect(log).toBeInstanceOf(UserBalanceChangeLog);
      expect(log.userId).toBe(user.id);
      expect(log.amount).toBe(-3000); // 음수로 기록 (BR-021)
      expect(log.beforeAmount).toBe(10000);
      expect(log.afterAmount).toBe(7000);
      expect(log.code).toBe(BalanceChangeCode.PAYMENT);
      expect(log.note).toBe('결제 차감');
      expect(log.refId).toBe(100);
    });

    it('잔액이 부족하면 DomainException(INSUFFICIENT_BALANCE)을 던진다 (BR-011)', () => {
      // given
      const user = new User(
        validUserData.id,
        5000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when & then
      expect(() => user.deduct(10000, '결제', 100)).toThrow(DomainException);

      try {
        user.deduct(10000, '결제', 100);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(
          ErrorCode.INSUFFICIENT_BALANCE,
        );
      }

      // 잔액은 변경되지 않음
      expect(user.balance).toBe(5000);
    });

    it('차감 금액이 0 이하이면 ValidationException을 던진다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when & then
      expect(() => user.deduct(0, '결제', 100)).toThrow(ValidationException);
      expect(() => user.deduct(0, '결제', 100)).toThrow(
        '차감 금액은 0보다 커야 합니다',
      );
      expect(() => user.deduct(-1000, '결제', 100)).toThrow(
        ValidationException,
      );
      expect(() => user.deduct(-1000, '결제', 100)).toThrow(
        '차감 금액은 0보다 커야 합니다',
      );
    });

    it('잔액 전액을 차감할 수 있다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.deduct(10000, '전액 결제', 100);

      // then
      expect(user.balance).toBe(0);
      expect(log.amount).toBe(-10000);
      expect(log.afterAmount).toBe(0);
    });
  });

  describe('adjust (잔액 조정)', () => {
    it('양수 금액으로 잔액을 증가시킬 수 있다', () => {
      // given
      const now = new Date('2025-01-15T10:00:00Z');
      jest.setSystemTime(now);

      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.adjust(3000, '관리자 조정');

      // then
      expect(user.balance).toBe(13000); // 10000 + 3000
      expect(user.updatedAt).toEqual(now);
      expect(log).toBeInstanceOf(UserBalanceChangeLog);
      expect(log.amount).toBe(3000); // 양수
      expect(log.beforeAmount).toBe(10000);
      expect(log.afterAmount).toBe(13000);
      expect(log.code).toBe(BalanceChangeCode.ADJUST);
      expect(log.note).toBe('관리자 조정');
    });

    it('음수 금액으로 잔액을 감소시킬 수 있다', () => {
      // given
      const now = new Date('2025-01-15T10:00:00Z');
      jest.setSystemTime(now);

      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.adjust(-3000, '관리자 차감');

      // then
      expect(user.balance).toBe(7000); // 10000 - 3000
      expect(user.updatedAt).toEqual(now);
      expect(log.amount).toBe(-3000); // 음수
      expect(log.beforeAmount).toBe(10000);
      expect(log.afterAmount).toBe(7000);
      expect(log.code).toBe(BalanceChangeCode.ADJUST);
    });

    it('조정 금액이 0이면 ValidationException을 던진다 (BR-021)', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when & then
      expect(() => user.adjust(0, '조정')).toThrow(ValidationException);
      expect(() => user.adjust(0, '조정')).toThrow(
        '조정 금액은 0이 될 수 없습니다',
      );
    });

    it('조정 후 잔액이 0 미만이 되면 ValidationException을 던지고 롤백한다', () => {
      // given
      const user = new User(
        validUserData.id,
        5000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when & then
      expect(() => user.adjust(-10000, '과도한 차감')).toThrow(
        ValidationException,
      );
      expect(() => user.adjust(-10000, '과도한 차감')).toThrow(
        '잔액은 0 미만이 될 수 없습니다',
      );

      // 잔액은 롤백되어 변경되지 않음
      expect(user.balance).toBe(5000);
    });

    it('refId 없이 조정할 수 있다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.adjust(1000, '조정');

      // then
      expect(user.balance).toBe(11000);
      expect(log.refId).toBeNull();
    });

    it('refId를 지정하여 조정할 수 있다', () => {
      // given
      const user = new User(
        validUserData.id,
        10000,
        validUserData.createdAt,
        validUserData.updatedAt,
      );

      // when
      const log = user.adjust(1000, '조정', 999);

      // then
      expect(user.balance).toBe(11000);
      expect(log.refId).toBe(999);
    });
  });

  describe('잔액 변경 시나리오', () => {
    it('충전 → 차감 → 조정 흐름이 정상 동작한다', () => {
      // given: 초기 잔액 0
      const user = new User(validUserData.id, 0, new Date(), new Date());

      // when: 10000원 충전
      const chargeLog = user.charge(10000, '초기 충전');

      // then
      expect(user.balance).toBe(10000);
      expect(chargeLog.beforeAmount).toBe(0);
      expect(chargeLog.afterAmount).toBe(10000);

      // when: 3000원 결제 차감
      const deductLog = user.deduct(3000, '주문 결제', 100);

      // then
      expect(user.balance).toBe(7000);
      expect(deductLog.beforeAmount).toBe(10000);
      expect(deductLog.afterAmount).toBe(7000);
      expect(deductLog.amount).toBe(-3000);

      // when: 2000원 관리자 차감
      const adjustLog = user.adjust(-2000, '관리자 차감');

      // then
      expect(user.balance).toBe(5000);
      expect(adjustLog.beforeAmount).toBe(7000);
      expect(adjustLog.afterAmount).toBe(5000);
      expect(adjustLog.amount).toBe(-2000);
    });

    it('여러 번의 충전/차감이 순차적으로 정확하게 처리된다 (BR-022)', () => {
      // given: 초기 잔액 1000
      const user = new User(validUserData.id, 1000, new Date(), new Date());
      const logs: UserBalanceChangeLog[] = [];

      // when: 충전 5000
      logs.push(user.charge(5000, '충전1'));
      expect(user.balance).toBe(6000);

      // when: 차감 2000
      logs.push(user.deduct(2000, '결제1', 1));
      expect(user.balance).toBe(4000);

      // when: 충전 3000
      logs.push(user.charge(3000, '충전2'));
      expect(user.balance).toBe(7000);

      // when: 차감 4000
      logs.push(user.deduct(4000, '결제2', 2));
      expect(user.balance).toBe(3000);

      // then: 모든 로그의 before/after가 연속적으로 일치
      expect(logs[0].beforeAmount).toBe(1000);
      expect(logs[0].afterAmount).toBe(6000);

      expect(logs[1].beforeAmount).toBe(6000);
      expect(logs[1].afterAmount).toBe(4000);

      expect(logs[2].beforeAmount).toBe(4000);
      expect(logs[2].afterAmount).toBe(7000);

      expect(logs[3].beforeAmount).toBe(7000);
      expect(logs[3].afterAmount).toBe(3000);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
});
