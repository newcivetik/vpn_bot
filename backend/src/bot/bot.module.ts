import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { UserModule } from '../user/user.module';
import { PlanModule } from '../plan/plan.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [UserModule, PlanModule, SubscriptionModule, PaymentModule],
  providers: [BotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
