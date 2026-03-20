import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../../subscription/subscription.service';
import { ServerService } from '../../server/server.service';
import { VpnService } from '../../vpn/vpn.service';
import { BotService } from '../../bot/bot.service';
import { messages } from '../../bot/bot.messages';
import { AdminNotifyService } from '../admin-notify/admin-notify.service';
import { PromoService } from '../../promo/promo.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private deactivating = false;
  private syncing = false;
  private serverDownSince = new Map<number, Date>(); // serverId -> first failure time

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly serverService: ServerService,
    private readonly vpnService: VpnService,
    private readonly botService: BotService,
    private readonly adminNotify: AdminNotifyService,
    private readonly promoService: PromoService,
    private readonly userService: UserService,
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
        this.adminNotify.subscriptionExpired(count).catch(() => {});
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
      // Process pending event queues
      await this.processEventQueues();
    } catch (e) {
      this.logger.error(`Ошибка деактивации: ${e}`);
    } finally {
      this.deactivating = false;
    }
  }

  /** Drain event queues from SubscriptionService and send notifications */
  private async processEventQueues() {
    // Referral bonus earned (friend paid)
    const bonusEvents = this.subscriptionService.referralBonusEarned.splice(0);
    for (const event of bonusEvents) {
      try {
        const referrer = await this.userService.findById(event.referrerId);
        if (referrer) {
          await this.botService.sendNotification(
            referrer.telegramId,
            messages.referralBonusEarned(event.friendName, event.bonusDays),
          );
        }
      } catch (e) {
        this.logger.error(`Ошибка уведомления о реферальном бонусе: ${e}`);
      }
    }

    // Referral tier milestones (5/10 friends)
    const tierEvents = this.subscriptionService.referralTierReached.splice(0);
    for (const event of tierEvents) {
      try {
        const referrer = await this.userService.findById(event.referrerId);
        if (!referrer) continue;

        if (event.count === 5) {
          // Grant 20% discount
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          await this.promoService.createPersonalDiscount(
            event.referrerId,
            20,
            0,
            'Бонус за 5 приглашённых друзей',
            expiresAt,
          );
          await this.botService.sendNotification(
            referrer.telegramId,
            messages.referralTier5(),
          );
        } else if (event.count === 10) {
          // Grant free month subscription
          await this.botService.sendNotification(
            referrer.telegramId,
            messages.referralTier10(),
          );
        }
      } catch (e) {
        this.logger.error(`Ошибка уведомления о реферальном тире: ${e}`);
      }
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

      // Notify users whose traffic was exhausted
      const exhausted = this.subscriptionService.trafficExhausted.splice(0);
      for (const item of exhausted) {
        const user = await this.userService.findById(item.userId);
        if (user) {
          await this.botService.sendNotification(
            user.telegramId,
            `🚫 Лимит трафика исчерпан\n\n` +
              `Подписка «${item.planName}» приостановлена.\n\n` +
              `Оформи новую подписку, чтобы продолжить пользоваться VPN 👇\n/start`,
          );
        }
      }

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
  // Only notify on 3rd consecutive failure (30 min down), then every hour
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkServerHealth() {
    try {
      const servers = await this.serverService.findAllActive();
      for (const server of servers) {
        const health = await this.vpnService.checkServerHealth(server);
        if (!health.online) {
          const now = new Date();
          if (!this.serverDownSince.has(server.id)) {
            this.serverDownSince.set(server.id, now);
          }
          const downSince = this.serverDownSince.get(server.id)!;
          const downMinutes = (now.getTime() - downSince.getTime()) / 60000;

          // Notify after 30 min down, then every 60 min
          if (downMinutes >= 30 && downMinutes % 60 < 10) {
            this.logger.error(
              `Сервер ${server.location} (${server.host}) не отвечает ${Math.round(downMinutes)} мин!`,
            );
            this.adminNotify
              .serverDown(server.location, server.host)
              .catch(() => {});
          }
        } else {
          if (this.serverDownSince.has(server.id)) {
            this.logger.log(
              `Сервер ${server.location} (${server.host}) снова онлайн`,
            );
            this.serverDownSince.delete(server.id);
          }
        }
      }
    } catch (e) {
      this.logger.error(`Ошибка проверки здоровья серверов: ${e}`);
    }
  }

  // Daily at 12:00 — offer 30% discount to users whose trial expired 2 days ago
  @Cron('0 12 * * *')
  async offerTrialDiscount() {
    try {
      const userIds = await this.subscriptionService.getTrialExpiredUsers(2);
      let sent = 0;
      for (const userId of userIds) {
        const user = await this.userService.findById(userId);
        if (!user) continue;

        // Skip if already has active discount
        const existing = await this.promoService.getActiveDiscount(userId);
        if (existing) continue;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 5);
        await this.promoService.createPersonalDiscount(
          userId,
          30,
          0,
          'Скидка после пробного периода',
          expiresAt,
        );

        await this.botService.sendNotification(
          user.telegramId,
          `⏰ Твой пробный период закончился\n\n` +
            `Тебе понравилось? Продли со скидкой 30%!\n\n` +
            `🎁 Скидка 30% на первую подписку\n` +
            `⏳ Предложение действует 5 дней\n\n` +
            `Оформи подписку — /start`,
        );
        sent++;
      }
      if (sent > 0) {
        this.logger.log(`Отправлено ${sent} предложений после триала`);
      }
    } catch (e) {
      this.logger.error(`Ошибка offerTrialDiscount: ${e}`);
    }
  }

  // Daily at 14:00 — offer 25% discount to churned paid users (7 days ago)
  @Cron('0 14 * * *')
  async reactivateChurned() {
    try {
      const userIds = await this.subscriptionService.getChurnedUsers(7);
      let sent = 0;
      for (const userId of userIds) {
        const user = await this.userService.findById(userId);
        if (!user) continue;

        const existing = await this.promoService.getActiveDiscount(userId);
        if (existing) continue;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.promoService.createPersonalDiscount(
          userId,
          25,
          0,
          'Скидка на возвращение',
          expiresAt,
        );

        await this.botService.sendNotification(
          user.telegramId,
          `Мы скучаем! 🥺\n\n` +
            `Давно не видели тебя. Вернись со скидкой!\n\n` +
            `🎁 Скидка 25% на любую подписку\n` +
            `⏳ Предложение действует 7 дней\n\n` +
            `Выбрать тариф — /start`,
        );
        sent++;
      }
      if (sent > 0) {
        this.logger.log(`Отправлено ${sent} предложений реактивации`);
      }
    } catch (e) {
      this.logger.error(`Ошибка reactivateChurned: ${e}`);
    }
  }

  private pluralizeDays(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
      return 'дня';
    return 'дней';
  }
}
