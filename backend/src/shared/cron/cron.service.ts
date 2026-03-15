import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../../subscription/subscription.service';
import { BotService } from '../../bot/bot.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly botService: BotService,
  ) {}

  // Каждые 5 минут — деактивация истёкших подписок
  @Cron(CronExpression.EVERY_5_MINUTES)
  async deactivateExpired() {
    const count = await this.subscriptionService.deactivateExpired();
    if (count > 0) {
      this.logger.log(`Деактивировано ${count} истёкших подписок`);
    }
  }

  // Каждый час — синхронизация трафика
  @Cron(CronExpression.EVERY_HOUR)
  async syncTraffic() {
    await this.subscriptionService.syncTraffic();
    this.logger.debug('Трафик синхронизирован');
  }

  // Каждый день в 10:00 — уведомления об истечении
  @Cron('0 10 * * *')
  async notifyExpiring() {
    const expiring = await this.subscriptionService.getExpiringSubscriptions(3);
    for (const sub of expiring) {
      const daysLeft = Math.ceil(
        (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      await this.botService.sendNotification(
        sub.user.telegramId,
        `⚠️ Ваша VPN-подписка "${sub.plan.name}" истекает через ${daysLeft} ${this.pluralizeDays(daysLeft)}.\n\nПродлите подписку, чтобы не потерять доступ.`,
      );
    }
  }

  private pluralizeDays(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
    return 'дней';
  }
}
