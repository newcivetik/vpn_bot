import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { AdminBotService } from './admin-bot.service';
import { BotController } from './bot.controller';
import { UserModule } from '../user/user.module';
import { PlanModule } from '../plan/plan.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentModule } from '../payment/payment.module';
import { ServerModule } from '../server/server.module';
import { PromoModule } from '../promo/promo.module';
import { SupportModule } from '../support/support.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    UserModule,
    PlanModule,
    forwardRef(() => SubscriptionModule),
    forwardRef(() => PaymentModule),
    ServerModule,
    PromoModule,
    forwardRef(() => SupportModule),
    forwardRef(() => AdminModule),
  ],
  providers: [BotService, AdminBotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
