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
  ): Promise<Subscription> {
    const user = await this.userService.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    const plan = await this.planService.findById(planId);
    if (!plan) throw new Error('Тариф не найден');

    const server = await this.serverService.findAvailable();
    if (!server) throw new Error('Нет доступных серверов');

    // Создаём клиента в 3X-UI
    const vpnClient = await this.vpnService.createClient(server, {
      telegramId: user.telegramId,
      trafficLimitGB: plan.trafficLimitGB,
      expiryDays: plan.durationDays,
      maxDevices: plan.maxDevices,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

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

    this.logger.log(`Подписка #${saved.id} создана для пользователя #${userId}`);
    return saved;
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
      relations: ['server'],
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
      }
    }
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
