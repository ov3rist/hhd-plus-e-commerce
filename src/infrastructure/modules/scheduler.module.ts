import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductPopularityScheduler } from '@infrastructure/schedulers/product-popularity.scheduler';
import { OrderExpirationScheduler } from '@infrastructure/schedulers/order-expiration.scheduler';
import { ProductModule } from './product.module';
import { OrderModule } from './order.module';

/**
 * Scheduler Module
 * 스케줄링 작업 관리 모듈
 */
@Module({
  imports: [ScheduleModule.forRoot(), ProductModule, OrderModule],
  providers: [ProductPopularityScheduler, OrderExpirationScheduler],
})
export class SchedulerModule {}
