import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './shared/config/env.validation';
import { UserModule } from './user/user.module';
import { PlanModule } from './plan/plan.module';
import { ServerModule } from './server/server.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import { VpnModule } from './vpn/vpn.module';
import { BotModule } from './bot/bot.module';
import { CronService } from './shared/cron/cron.service';
import { PromoModule } from './promo/promo.module';
import { AdminModule } from './admin/admin.module';

// Entities
import { User } from './user/user.entity';
import { Plan } from './plan/plan.entity';
import { Server } from './server/server.entity';
import { Subscription } from './subscription/subscription.entity';
import { Payment } from './payment/payment.entity';
import { PromoCode } from './promo/promo.entity';
import { PromoUsage } from './promo/promo-usage.entity';
import { PersonalDiscount } from './promo/personal-discount.entity';
import { SupportTicket, SupportMessage } from './support/support-ticket.entity';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [
          User,
          Plan,
          Server,
          Subscription,
          Payment,
          PromoCode,
          PromoUsage,
          PersonalDiscount,
          SupportTicket,
          SupportMessage,
        ],
        synchronize: false,
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    ScheduleModule.forRoot(),
    UserModule,
    PlanModule,
    ServerModule,
    SubscriptionModule,
    PaymentModule,
    VpnModule,
    BotModule,
    PromoModule,
    AdminModule,
    SupportModule,
  ],
  providers: [CronService],
})
export class AppModule {}
