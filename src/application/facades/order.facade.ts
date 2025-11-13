import { Product, ProductDomainService, ProductOption } from '@domain/product';
import { OrderDomainService } from '@domain/order';
import { Injectable } from '@nestjs/common';

export interface OrderViewDto {
  userId: number;
  balance: number;
}

@Injectable()
export class OrderFacade {
  constructor(private readonly orderService: OrderDomainService) {}

  /**
   * ANCHOR
   */
}
