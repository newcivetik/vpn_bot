import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket, SupportMessage } from './support-ticket.entity';
import { SupportService } from './support.service';
import { BotModule } from '../bot/bot.module';
import { AdminNotifyModule } from '../shared/admin-notify/admin-notify.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, SupportMessage]),
    forwardRef(() => BotModule),
    AdminNotifyModule,
  ],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
