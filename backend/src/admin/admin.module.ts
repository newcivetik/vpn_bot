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
import { VpnModule } from '../vpn/vpn.module';
import { BotModule } from '../bot/bot.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'admin-jwt-secret-change-me'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    TypeOrmModule.forFeature([User, Subscription, Payment, Plan, Server, PromoCode]),
    VpnModule,
    forwardRef(() => BotModule),
    forwardRef(() => SubscriptionModule),
    SettingsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
