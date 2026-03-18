import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../../subscription/subscription.service';
import { ServerService } from '../../server/server.service';
import { VpnService } from '../../vpn/vpn.service';
import { BotService } from '../../bot/bot.service';
import { messages } from '../../bot/bot.messages';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private deactivating = false;
  private syncing = false;

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly serverService: ServerService,
    private readonly vpnService: VpnService,
    private readonly botService: BotService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async deactivateExpired() {
    if (this.deactivating) {
      this.logger.warn('deactivateExpired already running, skipping');
      return;
    }
    this.deactivating = true;
    try {
      const { count, deactivated } =
        await this.subscriptionService.deactivateExpired();
      if (count > 0) {
        this.logger.log(`Деактивировано ${count} истёкших подписок`);
        for (const sub of deactivated) {
          try {
            await this.botService.sendNotification(
              sub.userId,
              messages.subscriptionExpired(sub.planName),
            );
          } catch (e) {
            this.logger.error(
              `Ошибка уведомления об истечении (tg=${sub.userId}): ${e}`,
            );
          }
        }
      }
    } catch (e) {
      this.logger.error(`Ошибка деактивации: ${e}`);
    } finally {
      this.deactivating = false;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncTraffic() {
    if (this.syncing) {
      this.logger.warn('syncTraffic already running, skipping');
      return;
    }
    this.syncing = true;
    try {
      const { synced, disabled } = await this.subscriptionService.syncTraffic();
      if (disabled > 0) {
        this.logger.warn(
          `Трафик: синхронизировано ${synced}, отключено по лимиту ${disabled}`,
        );
      } else {
        this.logger.debug(`Трафик синхронизирован: ${synced}`);
      }
    } catch (e) {
      this.logger.error(`Ошибка синхронизации трафика: ${e}`);
    } finally {
      this.syncing = false;
    }
  }

  @Cron('0 10 * * *')
  async notifyExpiring() {
    for (const threshold of [7, 3, 1]) {
      try {
        const expiring =
          await this.subscriptionService.getExpiringSubscriptions(threshold);
        for (const sub of expiring) {
          if (!sub.user.notifyBeforeExpiry) continue;

          const daysLeft = Math.ceil(
            (new Date(sub.expiresAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          );

          if (threshold === 7 && (daysLeft > 7 || daysLeft <= 3)) continue;
          if (threshold === 3 && (daysLeft > 3 || daysLeft <= 1)) continue;
          if (threshold === 1 && daysLeft > 1) continue;

          const pluralDays = this.pluralizeDays(daysLeft);
          await this.botService.sendNotification(
            sub.user.telegramId,
            messages.expiryNotification(sub.plan.name, daysLeft, pluralDays),
          );
        }
      } catch (e) {
        this.logger.error(`Ошибка уведомлений (threshold=${threshold}): ${e}`);
      }
    }
  }

  // Every 6 hours: warn users approaching traffic limit (80%+)
  @Cron('0 */6 * * *')
  async notifyTrafficWarning() {
    try {
      const approaching =
        await this.subscriptionService.getTrafficWarningSubscriptions(80);
      for (const sub of approaching) {
        if (!sub.user.notifyBeforeExpiry) continue;
        await this.botService.sendNotification(
          sub.user.telegramId,
          messages.trafficWarning(
            sub.plan.name,
            Number(sub.trafficUsedGB),
            sub.plan.trafficLimitGB,
          ),
        );
      }
      if (approaching.length > 0) {
        this.logger.log(
          `Отправлено ${approaching.length} предупреждений о трафике`,
        );
      }
    } catch (e) {
      this.logger.error(`Ошибка уведомлений о трафике: ${e}`);
    }
  }

  // Every 10 minutes: check server health
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkServerHealth() {
    try {
      const servers = await this.serverService.findAllActive();
      for (const server of servers) {
        const health = await this.vpnService.checkServerHealth(server);
        if (!health.online) {
          this.logger.error(
            `Сервер ${server.location} (${server.host}) не отвечает!`,
          );
        }
      }
    } catch (e) {
      this.logger.error(`Ошибка проверки здоровья серверов: ${e}`);
    }
  }

  private pluralizeDays(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
      return 'дня';
    return 'дней';
  }
}
