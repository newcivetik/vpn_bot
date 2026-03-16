import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './subscription.entity';
import { VpnService } from '../vpn/vpn.service';
import { ServerService } from '../server/server.service';
import { PlanService } from '../plan/plan.service';
import { UserService } from '../user/user.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly vpnService: VpnService,
    private readonly serverService: ServerService,
    private readonly planService: PlanService,
    private readonly userService: UserService,
  ) {}

  async createSubscription(
    userId: number,
    planId: number,
    options?: { bonusDays?: number },
  ): Promise<Subscription> {
    const user = await this.userService.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    const plan = await this.planService.findById(planId);
    if (!plan) throw new Error('Тариф не найден');

    const server = await this.serverService.findAvailable();
    if (!server) throw new Error('Нет доступных серверов');

    const totalDays = plan.durationDays + (options?.bonusDays || 0);

    // Создаём клиента в 3X-UI
    const vpnClient = await this.vpnService.createClient(server, {
      telegramId: user.telegramId,
      trafficLimitGB: plan.trafficLimitGB,
      expiryDays: totalDays,
      maxDevices: plan.maxDevices,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + totalDays);

    const subscription = this.subRepo.create({
      userId,
      planId,
      serverId: server.id,
      vpnClientId: vpnClient.clientId,
      vpnClientEmail: vpnClient.email,
      connectionLink: vpnClient.connectionLink,
      status: SubscriptionStatus.ACTIVE,
      expiresAt,
    });

    const saved = await this.subRepo.save(subscription);
    await this.serverService.incrementClients(server.id);

    // Реферальный бонус — продлеваем подписку реферера
    const refBonusDays = parseInt(process.env.REFERRAL_BONUS_DAYS || '3', 10);
    if (user.referrerId && refBonusDays > 0) {
      await this.userService.addReferralBonus(user.referrerId, refBonusDays);
      await this.extendActiveSubscription(user.referrerId, refBonusDays);
      this.logger.log(`Реферальный бонус ${refBonusDays} дн. начислен и применён к подписке пользователя #${user.referrerId}`);
    }

    if (options?.bonusDays) {
      this.logger.log(`Подписка #${saved.id} создана с +${options.bonusDays} бонус. дн.`);
    }
    this.logger.log(`Подписка #${saved.id} создана для пользователя #${userId} (${totalDays} дн.)`);
    return saved;
  }

  /** Продлевает активную подписку пользователя на N дней */
  async extendActiveSubscription(userId: number, days: number): Promise<void> {
    const sub = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    if (!sub) return;

    const newExpiry = new Date(sub.expiresAt);
    newExpiry.setDate(newExpiry.getDate() + days);
    sub.expiresAt = newExpiry;
    await this.subRepo.save(sub);
    this.logger.log(`Подписка #${sub.id} продлена на ${days} дн. (до ${newExpiry.toISOString().slice(0, 10)})`);
  }

  async getActiveSubscription(userId: number): Promise<Subscription | null> {
    return this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan', 'server'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSubscriptions(userId: number): Promise<Subscription[]> {
    return this.subRepo.find({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async deactivateExpired(): Promise<number> {
    const expired = await this.subRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
      relations: ['server'],
    });

    for (const sub of expired) {
      await this.vpnService.toggleClient(
        sub.server,
        sub.vpnClientId,
        sub.vpnClientEmail,
        false,
      );
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subRepo.save(sub);
      await this.serverService.decrementClients(sub.serverId);
      this.logger.log(`Подписка #${sub.id} истекла`);
    }

    return expired.length;
  }

  async syncTraffic(): Promise<void> {
    const active = await this.subRepo.find({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: ['server', 'plan'],
    });

    for (const sub of active) {
      const traffic = await this.vpnService.getClientTraffic(
        sub.server,
        sub.vpnClientEmail,
      );
      if (traffic) {
        const totalBytes = traffic.up + traffic.down;
        sub.trafficUsedGB = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        await this.subRepo.save(sub);

        // Отключаем при превышении лимита трафика
        if (sub.plan.trafficLimitGB > 0 && sub.trafficUsedGB >= sub.plan.trafficLimitGB) {
          await this.vpnService.toggleClient(sub.server, sub.vpnClientId, sub.vpnClientEmail, false);
          sub.status = SubscriptionStatus.EXPIRED;
          await this.subRepo.save(sub);
          await this.serverService.decrementClients(sub.serverId);
          this.logger.warn(`Подписка #${sub.id} отключена — лимит трафика (${sub.trafficUsedGB}/${sub.plan.trafficLimitGB} ГБ)`);
        }
      }
    }
  }

  async changeServer(subscriptionId: number, newServerId: number): Promise<Subscription> {
    const sub = await this.subRepo.findOne({
      where: { id: subscriptionId },
      relations: ['server'],
    });
    if (!sub) throw new Error('Подписка не найдена');

    const newServer = await this.serverService.findById(newServerId);
    if (!newServer || !newServer.isActive) throw new Error('Сервер недоступен');

    // Удаляем клиента на старом сервере
    await this.vpnService.deleteClient(sub.server, sub.vpnClientId);
    await this.serverService.decrementClients(sub.serverId);

    // Считаем оставшиеся дни
    const remainingMs = new Date(sub.expiresAt).getTime() - Date.now();
    const remainingDays = Math.max(1, Math.ceil(remainingMs / 86400000));

    const plan = await this.planService.findById(sub.planId);

    // Создаём клиента на новом сервере
    const user = await this.userService.findById(sub.userId);
    const vpnClient = await this.vpnService.createClient(newServer, {
      telegramId: user!.telegramId,
      trafficLimitGB: plan?.trafficLimitGB || 0,
      expiryDays: remainingDays,
      maxDevices: plan?.maxDevices || 1,
    });

    sub.serverId = newServer.id;
    sub.server = newServer;
    sub.vpnClientId = vpnClient.clientId;
    sub.vpnClientEmail = vpnClient.email;
    sub.connectionLink = vpnClient.connectionLink;
    await this.subRepo.save(sub);
    await this.serverService.incrementClients(newServer.id);

    this.logger.log(`Подписка #${sub.id} перенесена на сервер #${newServer.id}`);
    return sub;
  }

  async getExpiringSubscriptions(daysBeforeExpiry: number): Promise<Subscription[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysBeforeExpiry);

    return this.subRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: LessThan(threshold),
      },
      relations: ['user', 'plan'],
    });
  }
}
