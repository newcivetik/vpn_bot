import { Module, forwardRef } from '@nestjs/common';
import { AdminNotifyService } from './admin-notify.service';
import { BotModule } from '../../bot/bot.module';

@Module({
  imports: [forwardRef(() => BotModule)],
  providers: [AdminNotifyService],
  exports: [AdminNotifyService],
})
export class AdminNotifyModule {}
