import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { UserModule } from '../user/user.module';
import { PlanModule } from '../plan/plan.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentModule } from '../payment/payment.module';
import { ServerModule } from '../server/server.module';
import { PromoModule } from '../promo/promo.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [UserModule, PlanModule, forwardRef(() => SubscriptionModule), PaymentModule, ServerModule, PromoModule, SettingsModule],
  providers: [BotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
