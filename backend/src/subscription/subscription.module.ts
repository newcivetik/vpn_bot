import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { VpnModule } from '../vpn/vpn.module';
import { ServerModule } from '../server/server.module';
import { PlanModule } from '../plan/plan.module';
import { UserModule } from '../user/user.module';
import { PaymentModule } from '../payment/payment.module';
import { BotModule } from '../bot/bot.module';
import { PromoModule } from '../promo/promo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    VpnModule,
    ServerModule,
    PlanModule,
    UserModule,
    forwardRef(() => PaymentModule),
    forwardRef(() => BotModule),
    PromoModule,
  ],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
