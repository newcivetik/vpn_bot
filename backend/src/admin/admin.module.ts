import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { User } from '../user/user.entity';
import { Subscription } from '../subscription/subscription.entity';
import { Payment } from '../payment/payment.entity';
import { Plan } from '../plan/plan.entity';
import { Server } from '../server/server.entity';
import { PromoCode } from '../promo/promo.entity';
import { PersonalDiscount } from '../promo/personal-discount.entity';
import { AdminLog } from './admin-log.entity';
import { AdminSettings } from './admin-settings.entity';
import { VpnModule } from '../vpn/vpn.module';
import { BotModule } from '../bot/bot.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ServerModule } from '../server/server.module';
import { PromoModule } from '../promo/promo.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Subscription,
      Payment,
      Plan,
      Server,
      PromoCode,
      PersonalDiscount,
      AdminLog,
      AdminSettings,
    ]),
    VpnModule,
    ServerModule,
    forwardRef(() => BotModule),
    forwardRef(() => SubscriptionModule),
    PromoModule,
    SupportModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
  exports: [AdminService],
})
export class AdminModule {}
