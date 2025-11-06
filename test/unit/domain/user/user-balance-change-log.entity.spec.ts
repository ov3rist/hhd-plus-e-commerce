import {
  UserBalanceChangeLog,
  BalanceChangeCode,
} from '@domain/user/user-balance-change-log.entity';
import { ValidationException } from '@domain/common/exceptions';

describe('UserBalanceChangeLog Entity', () => {
  const validLogData = {
    id: 1,
    userId: 100,
    amount: 5000,
    beforeAmount: 10000,
    afterAmount: 15000,
    code: BalanceChangeCode.SYSTEM_CHARGE,
    note: '테스트 충전',
    refId: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  describe('생성자', () => {
    it('유효한 데이터로 UserBalanceChangeLog를 생성할 수 있다', () => {
      // when
      const log = new UserBalanceChangeLog(
        validLogData.id,
        validLogData.userId,
        validLogData.amount,
        validLogData.beforeAmount,
        validLogData.afterAmount,
        validLogData.code,
        validLogData.note,
        validLogData.refId,
        validLogData.createdAt,
      );

      // then
      expect(log.id).toBe(validLogData.id);
      expect(log.userId).toBe(validLogData.userId);
      expect(log.amount).toBe(validLogData.amount);
      expect(log.beforeAmount).toBe(validLogData.beforeAmount);
      expect(log.afterAmount).toBe(validLogData.afterAmount);
      expect(log.code).toBe(validLogData.code);
      expect(log.note).toBe(validLogData.note);
      expect(log.refId).toBe(validLogData.refId);
      expect(log.createdAt).toEqual(validLogData.createdAt);
    });

    it('note와 refId가 null이어도 생성할 수 있다', () => {
      // when
      const log = new UserBalanceChangeLog(
        validLogData.id,
        validLogData.userId,
        validLogData.amount,
        validLogData.beforeAmount,
        validLogData.afterAmount,
        validLogData.code,
        null,
        null,
        validLogData.createdAt,
      );

      // then
      expect(log.note).toBeNull();
      expect(log.refId).toBeNull();
    });

    it('amount가 음수인 로그를 생성할 수 있다 (차감)', () => {
      // when
      const log = new UserBalanceChangeLog(
        validLogData.id,
        validLogData.userId,
        -3000,
        10000,
        7000,
        BalanceChangeCode.PAYMENT,
        '결제 차감',
        100,
        validLogData.createdAt,
      );

      // then
      expect(log.amount).toBe(-3000);
      expect(log.beforeAmount).toBe(10000);
      expect(log.afterAmount).toBe(7000);
      expect(log.code).toBe(BalanceChangeCode.PAYMENT);
    });

    describe('검증 규칙', () => {
      it('amount가 0이면 ValidationException을 던진다 (BR-021)', () => {
        // when & then
        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            0, // 0은 불가
            validLogData.beforeAmount,
            validLogData.beforeAmount, // before와 동일
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            0,
            validLogData.beforeAmount,
            validLogData.beforeAmount,
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow('잔액 변경 금액은 0이 될 수 없습니다');
      });

      it('afterAmount가 beforeAmount + amount와 일치하지 않으면 ValidationException을 던진다 (BR-022)', () => {
        // when & then
        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            5000,
            10000,
            16000, // 10000 + 5000 = 15000이어야 하는데 16000
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            5000,
            10000,
            16000,
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow('잔액 변경 계산이 일치하지 않습니다');
      });

      it('beforeAmount가 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            5000,
            -1000, // 음수 불가
            4000,
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            5000,
            -1000,
            4000,
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow('잔액은 0 이상이어야 합니다');
      });

      it('afterAmount가 음수이면 ValidationException을 던진다', () => {
        // when & then
        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            -2000,
            1000,
            -1000, // 음수 불가
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow(ValidationException);

        expect(() => {
          new UserBalanceChangeLog(
            validLogData.id,
            validLogData.userId,
            -2000,
            1000,
            -1000,
            validLogData.code,
            validLogData.note,
            validLogData.refId,
            validLogData.createdAt,
          );
        }).toThrow('잔액은 0 이상이어야 합니다');
      });

      it('beforeAmount와 afterAmount가 0이어도 생성할 수 있다 (잔액 0원 시작)', () => {
        // when
        const log = new UserBalanceChangeLog(
          validLogData.id,
          validLogData.userId,
          5000, // amount는 0이 아니어야 함
          0,
          5000,
          validLogData.code,
          validLogData.note,
          validLogData.refId,
          validLogData.createdAt,
        );

        // then
        expect(log.beforeAmount).toBe(0);
        expect(log.afterAmount).toBe(5000);
        expect(log.amount).toBe(5000);
      });
    });
  });

  describe('create 팩토리 메서드', () => {
    it('유효한 데이터로 UserBalanceChangeLog를 생성할 수 있다', () => {
      // given
      const userId = 100;
      const amount = 5000;
      const beforeAmount = 10000;
      const afterAmount = 15000;
      const code = BalanceChangeCode.SYSTEM_CHARGE;
      const note = '충전 테스트';
      const refId = 999;

      // when
      const log = UserBalanceChangeLog.create(
        userId,
        amount,
        beforeAmount,
        afterAmount,
        code,
        note,
        refId,
      );

      // then
      expect(log).toBeInstanceOf(UserBalanceChangeLog);
      expect(log.id).toBe(0); // DB 생성 전
      expect(log.userId).toBe(userId);
      expect(log.amount).toBe(amount);
      expect(log.beforeAmount).toBe(beforeAmount);
      expect(log.afterAmount).toBe(afterAmount);
      expect(log.code).toBe(code);
      expect(log.note).toBe(note);
      expect(log.refId).toBe(refId);
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('note와 refId 없이 생성할 수 있다', () => {
      // when
      const log = UserBalanceChangeLog.create(
        100,
        5000,
        10000,
        15000,
        BalanceChangeCode.SYSTEM_CHARGE,
      );

      // then
      expect(log.note).toBeNull();
      expect(log.refId).toBeNull();
    });

    it('afterAmount가 beforeAmount + amount와 일치하지 않으면 ValidationException을 던진다 (BR-022)', () => {
      // when & then
      expect(() => {
        UserBalanceChangeLog.create(
          100,
          5000,
          10000,
          16000, // 15000이어야 함
          BalanceChangeCode.SYSTEM_CHARGE,
        );
      }).toThrow(ValidationException);

      expect(() => {
        UserBalanceChangeLog.create(
          100,
          5000,
          10000,
          16000,
          BalanceChangeCode.SYSTEM_CHARGE,
        );
      }).toThrow('잔액 변경 계산이 일치하지 않습니다');
    });

    it('음수 amount로 차감 로그를 생성할 수 있다', () => {
      // when
      const log = UserBalanceChangeLog.create(
        100,
        -3000,
        10000,
        7000,
        BalanceChangeCode.PAYMENT,
        '결제 차감',
        200,
      );

      // then
      expect(log.amount).toBe(-3000);
      expect(log.beforeAmount).toBe(10000);
      expect(log.afterAmount).toBe(7000);
      expect(log.code).toBe(BalanceChangeCode.PAYMENT);
    });
  });

  describe('BalanceChangeCode (잔액 변경 유형)', () => {
    it('모든 변경 유형 코드가 정의되어 있다 (BR-023)', () => {
      // then
      expect(BalanceChangeCode.SYSTEM_CHARGE).toBe('SYSTEM_CHARGE');
      expect(BalanceChangeCode.PAYMENT).toBe('PAYMENT');
      expect(BalanceChangeCode.REFUND).toBe('REFUND');
      expect(BalanceChangeCode.ADJUST).toBe('ADJUST');
    });

    it('각 유형 코드로 로그를 생성할 수 있다', () => {
      // when & then
      const chargeLog = UserBalanceChangeLog.create(
        100,
        5000,
        0,
        5000,
        BalanceChangeCode.SYSTEM_CHARGE,
        '시스템 충전',
      );
      expect(chargeLog.code).toBe(BalanceChangeCode.SYSTEM_CHARGE);

      const paymentLog = UserBalanceChangeLog.create(
        100,
        -3000,
        5000,
        2000,
        BalanceChangeCode.PAYMENT,
        '주문 결제',
        100,
      );
      expect(paymentLog.code).toBe(BalanceChangeCode.PAYMENT);

      const refundLog = UserBalanceChangeLog.create(
        100,
        3000,
        2000,
        5000,
        BalanceChangeCode.REFUND,
        '주문 취소 환불',
        100,
      );
      expect(refundLog.code).toBe(BalanceChangeCode.REFUND);

      const adjustLog = UserBalanceChangeLog.create(
        100,
        1000,
        5000,
        6000,
        BalanceChangeCode.ADJUST,
        '관리자 조정',
      );
      expect(adjustLog.code).toBe(BalanceChangeCode.ADJUST);
    });
  });

  describe('잔액 변경 로그 시나리오', () => {
    it('충전 → 결제 → 환불 흐름의 로그가 정확하다 (BR-022)', () => {
      // given: 초기 잔액 0원
      const userId = 100;
      const orderId = 200;
      const logs: UserBalanceChangeLog[] = [];

      // when: 10000원 충전
      const chargeLog = UserBalanceChangeLog.create(
        userId,
        10000,
        0,
        10000,
        BalanceChangeCode.SYSTEM_CHARGE,
        '초기 충전',
      );
      logs.push(chargeLog);

      // when: 3000원 결제 차감
      const paymentLog = UserBalanceChangeLog.create(
        userId,
        -3000,
        10000,
        7000,
        BalanceChangeCode.PAYMENT,
        '주문 결제',
        orderId,
      );
      logs.push(paymentLog);

      // when: 3000원 환불 복원
      const refundLog = UserBalanceChangeLog.create(
        userId,
        3000,
        7000,
        10000,
        BalanceChangeCode.REFUND,
        '주문 취소 환불',
        orderId,
      );
      logs.push(refundLog);

      // then: 모든 로그가 유효하고 연속적
      expect(logs[0].beforeAmount).toBe(0);
      expect(logs[0].afterAmount).toBe(10000);
      expect(logs[0].amount).toBe(10000);

      expect(logs[1].beforeAmount).toBe(10000);
      expect(logs[1].afterAmount).toBe(7000);
      expect(logs[1].amount).toBe(-3000);
      expect(logs[1].refId).toBe(orderId);

      expect(logs[2].beforeAmount).toBe(7000);
      expect(logs[2].afterAmount).toBe(10000);
      expect(logs[2].amount).toBe(3000);
      expect(logs[2].refId).toBe(orderId);

      // BR-022: after = before + amount 검증
      logs.forEach((log) => {
        expect(log.afterAmount).toBe(log.beforeAmount + log.amount);
      });
    });

    it('여러 건의 결제가 순차적으로 기록된다 (NFR-014 관련)', () => {
      // given: 초기 잔액 10000원
      const userId = 100;
      let currentBalance = 10000;
      const logs: UserBalanceChangeLog[] = [];

      // when: 2000원씩 5번 결제
      for (let i = 1; i <= 5; i++) {
        const beforeAmount = currentBalance;
        const afterAmount = currentBalance - 2000;

        const log = UserBalanceChangeLog.create(
          userId,
          -2000,
          beforeAmount,
          afterAmount,
          BalanceChangeCode.PAYMENT,
          `주문 ${i}`,
          100 + i,
        );

        logs.push(log);
        currentBalance = afterAmount;
      }

      // then: 모든 로그가 연속적으로 올바르게 기록됨
      expect(logs).toHaveLength(5);
      expect(logs[0].beforeAmount).toBe(10000);
      expect(logs[0].afterAmount).toBe(8000);
      expect(logs[1].beforeAmount).toBe(8000);
      expect(logs[1].afterAmount).toBe(6000);
      expect(logs[2].beforeAmount).toBe(6000);
      expect(logs[2].afterAmount).toBe(4000);
      expect(logs[3].beforeAmount).toBe(4000);
      expect(logs[3].afterAmount).toBe(2000);
      expect(logs[4].beforeAmount).toBe(2000);
      expect(logs[4].afterAmount).toBe(0);

      // 최종 잔액
      expect(currentBalance).toBe(0);
    });
  });

  // TypeScript의 readonly는 컴파일 타임에만 검증되므로
  // 별도의 런타임 불변성 테스트는 작성하지 않음
  // RF-023: Append-only는 Repository 계층에서 구현 (도메인 테스트 범위 아님)
});
