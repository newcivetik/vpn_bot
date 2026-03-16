import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../../subscription/subscription.service';
import { BotService } from '../../bot/bot.service';
import { ServerService } from '../../server/server.service';
import { VpnService } from '../../vpn/vpn.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly botService: BotService,
    private readonly serverService: ServerService,
    private readonly vpnService: VpnService,
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

  // Каждый день в 10:00 — уведомления об истечении (7, 3, 1 день)
  @Cron('0 10 * * *')
  async notifyExpiring() {
    for (const threshold of [7, 3, 1]) {
      const expiring = await this.subscriptionService.getExpiringSubscriptions(threshold);
      for (const sub of expiring) {
        if (!sub.user.notifyBeforeExpiry) continue;

        const daysLeft = Math.ceil(
          (new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        // Уведомляем только если дней осталось в диапазоне текущего порога
        if (threshold === 7 && (daysLeft > 7 || daysLeft <= 3)) continue;
        if (threshold === 3 && (daysLeft > 3 || daysLeft <= 1)) continue;
        if (threshold === 1 && daysLeft > 1) continue;

        const emoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '📢';
        await this.botService.sendNotification(
          sub.user.telegramId,
          `${emoji} Твоя подписка «${sub.plan.name}» истекает через ${daysLeft} ${this.pluralizeDays(daysLeft)}!\n\n` +
          `Продли, чтобы не потерять доступ 🛡`,
        );
      }
    }
  }

  // Каждые 10 минут — проверка здоровья серверов + автофейловер
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkServerHealth() {
    const servers = await this.serverService.findAll();

    for (const server of servers) {
      const isHealthy = await this.vpnService.checkHealth(server);

      if (!isHealthy && server.isActive) {
        this.logger.warn(
          `Сервер ${server.name} (${server.host}) недоступен — помечаем как неактивный`,
        );
        await this.serverService.markInactive(server.id);

        // Auto-failover: migrate active subscriptions to a healthy server
        await this.failoverSubscriptions(server.id, server.name);
      } else if (isHealthy && !server.isActive) {
        this.logger.log(
          `Сервер ${server.name} (${server.host}) снова доступен — помечаем как активный`,
        );
        await this.serverService.markActive(server.id);
      }
    }
  }

  /** Migrate all active subscriptions from a down server to a healthy one */
  private async failoverSubscriptions(downServerId: number, downServerName: string) {
    const subscriptions = await this.subscriptionService.findActiveByServerId(downServerId);

    if (subscriptions.length === 0) {
      this.logger.log(`Нет активных подписок на сервере #${downServerId} для миграции`);
      return;
    }

    // Find a healthy server to migrate to
    const healthyServer = await this.serverService.findAvailable();
    if (!healthyServer) {
      this.logger.error(
        `Нет доступных серверов для миграции ${subscriptions.length} подписок с сервера #${downServerId}`,
      );
      return;
    }

    this.logger.log(
      `Мигрируем ${subscriptions.length} подписок с сервера ${downServerName} на ${healthyServer.name}`,
    );

    for (const sub of subscriptions) {
      try {
        await this.subscriptionService.changeServer(sub.id, healthyServer.id);

        // Notify the user about the server change
        if (sub.user?.telegramId) {
          const updatedSub = await this.subscriptionService.getActiveSubscription(sub.userId);
          await this.botService.sendNotification(
            sub.user.telegramId,
            `🔄 Сервер ${downServerName} временно недоступен.\n\n` +
            `Твоя подписка «${sub.plan?.name || 'VPN'}» автоматически перенесена на сервер ${healthyServer.name} (${healthyServer.location}).\n\n` +
            `🔑 Новый ключ:\n\`${updatedSub?.connectionLink || 'Используй /key для получения ключа'}\``,
          );
        }

        this.logger.log(`Подписка #${sub.id} мигрирована на сервер ${healthyServer.name}`);
      } catch (error) {
        this.logger.error(
          `Ошибка миграции подписки #${sub.id}: ${error}`,
        );
      }
    }
  }

  // Каждый день в 12:00 — напоминание неактивным пользователям
  @Cron('0 12 * * *')
  async notifyInactiveUsers() {
    const inactiveSubs = await this.subscriptionService.findInactiveTrafficSubscriptions(3);

    for (const sub of inactiveSubs) {
      if (!sub.user?.telegramId) continue;

      await this.botService.sendNotification(
        sub.user.telegramId,
        `👋 Привет! Мы заметили, что ты не пользуешься VPN уже несколько дней.\n\n` +
        `Твоя подписка «${sub.plan?.name || 'VPN'}» всё ещё активна. ` +
        `Не забывай включать VPN для безопасного интернета! 🛡\n\n` +
        `Если нужна помощь с подключением — /help`,
      );

      this.logger.debug(`Напоминание отправлено пользователю #${sub.userId} (неактивен 3+ дней)`);
    }

    if (inactiveSubs.length > 0) {
      this.logger.log(`Отправлено ${inactiveSubs.length} напоминаний неактивным пользователям`);
    }
  }

  private pluralizeDays(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
    return 'дней';
  }
}
