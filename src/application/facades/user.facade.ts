import { UserDomainService } from '@domain/user';
import { Injectable } from '@nestjs/common';

export interface UserViewDto {
  userId: number;
  balance: number;
}

@Injectable()
export class UserFacade {
  constructor(private readonly userService: UserDomainService) {}

  /**
   * ANCHOR user.chargeBalance
   */
  async chargeBalance(userId: number, amount: number): Promise<UserViewDto> {
    const user = await this.userService.getUser(userId);
    user.charge(amount);

    return {
      userId: user.id,
      balance: user.balance,
    };
  }
}
