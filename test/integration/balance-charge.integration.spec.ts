import { UserService } from '@application/user.service';
import {
  UserRepository,
  UserBalanceChangeLogRepository,
} from '@infrastructure/repositories';
import { User } from '@domain/user/user.entity';

describe('잔액 충전 통합 테스트 (관리자 기능)', () => {
  let userService: UserService;
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    const balanceLogRepository = new UserBalanceChangeLogRepository();

    userService = new UserService(userRepository, balanceLogRepository);
  });

  describe('user.balance 동시성', () => {
    it('동시에 10번 충전 시 잔액이 정확히 증가한다', async () => {
      // Given: 초기 잔액 10,000원
      const user = await userRepository.save(
        new User(0, 10000, new Date(), new Date()),
      );

      // When: 10번 동시에 5,000원씩 충전
      await Promise.all(
        Array.from({ length: 10 }, () =>
          userService.chargeBalance(user.id, 5000),
        ),
      );

      // Then: 정확히 60,000원
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.balance).toBe(60000);
    });
  });
});
