import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async createSubscription(
    userId: number,
    planId: number,
  ): Promise<Subscription> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const plan = await this.planService.findById(planId);
    if (!plan) throw new NotFoundException('Тариф не найден');

    const server = await this.serverService.findAvailable();
    if (!server) throw new BadRequestException('Нет доступных серверов');

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

    // Считаем предыдущие подписки ДО сохранения новой (fix race condition)
    const previousSubs = user.referrerId
      ? await this.subRepo.count({ where: { userId } })
      : 0;

    const saved = await this.subRepo.save(subscription);
    await this.serverService.incrementClients(server.id);

    // Реферальный бонус — только при первой покупке
    const bonusDays = this.configService.get<number>('REFERRAL_BONUS_DAYS', 3);
    if (user.referrerId && bonusDays > 0 && previousSubs === 0) {
      await this.userService.addReferralBonus(user.referrerId, bonusDays);
      this.logger.log(
        `Реферальный бонус ${bonusDays} дн. начислен пользователю #${user.referrerId}`,
      );
    }

    this.logger.log(
      `Подписка #${saved.id} создана для пользователя #${userId}`,
    );
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

  async deactivateExpired(): Promise<{
    count: number;
    deactivated: { userId: number; planName: string }[];
  }> {
    const expired = await this.subRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
      relations: ['server', 'user', 'plan'],
    });

    let count = 0;
    const deactivated: { userId: number; planName: string }[] = [];
    const batchSize = 5;
    for (let i = 0; i < expired.length; i += batchSize) {
      const batch = expired.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            await this.vpnService.toggleClient(
              sub.server,
              sub.vpnClientId,
              sub.vpnClientEmail,
              false,
            );
            sub.status = SubscriptionStatus.EXPIRED;
            await this.subRepo.save(sub);
            await this.serverService.decrementClients(sub.serverId);
            deactivated.push({
              userId: sub.user.telegramId,
              planName: sub.plan.name,
            });
            this.logger.log(`Подписка #${sub.id} истекла`);
            count++;
          } catch (e) {
            this.logger.error(`Ошибка деактивации подписки #${sub.id}: ${e}`);
          }
        }),
      );
    }

    return { count, deactivated };
  }

  async syncTraffic(): Promise<{ synced: number; disabled: number }> {
    const active = await this.subRepo.find({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: ['server', 'plan'],
    });

    let synced = 0;
    let disabled = 0;
    const batchSize = 5;
    for (let i = 0; i < active.length; i += batchSize) {
      const batch = active.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            const traffic = await this.vpnService.getClientTraffic(
              sub.server,
              sub.vpnClientEmail,
            );
            if (traffic) {
              const totalBytes = traffic.up + traffic.down;
              sub.trafficUsedGB = Number(
                (totalBytes / (1024 * 1024 * 1024)).toFixed(2),
              );
              await this.subRepo.save(sub);
              synced++;

              // Enforce traffic limit
              if (
                sub.plan.trafficLimitGB > 0 &&
                sub.trafficUsedGB >= sub.plan.trafficLimitGB
              ) {
                await this.vpnService.toggleClient(
                  sub.server,
                  sub.vpnClientId,
                  sub.vpnClientEmail,
                  false,
                );
                sub.status = SubscriptionStatus.EXPIRED;
                await this.subRepo.save(sub);
                await this.serverService.decrementClients(sub.serverId);
                this.logger.warn(
                  `Подписка #${sub.id} отключена: лимит трафика ${sub.plan.trafficLimitGB} ГБ исчерпан`,
                );
                disabled++;
              }
            }
          } catch (e) {
            this.logger.warn(
              `Ошибка синхронизации трафика подписки #${sub.id}: ${e}`,
            );
          }
        }),
      );
    }

    return { synced, disabled };
  }

  async changeServer(
    subscriptionId: number,
    newServerId: number,
  ): Promise<Subscription> {
    const sub = await this.subRepo.findOne({
      where: { id: subscriptionId },
      relations: ['server'],
    });
    if (!sub) throw new NotFoundException('Подписка не найдена');

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Подписка не активна');
    }

    const remainingMs = new Date(sub.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      throw new BadRequestException('Подписка истекла');
    }

    const newServer = await this.serverService.findById(newServerId);
    if (!newServer || !newServer.isActive)
      throw new BadRequestException('Сервер недоступен');

    const remainingDays = Math.max(1, Math.ceil(remainingMs / 86400000));
    const plan = await this.planService.findById(sub.planId);
    const user = await this.userService.findById(sub.userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    // Create on new server FIRST (safe: if this fails, old connection still works)
    const vpnClient = await this.vpnService.createClient(newServer, {
      telegramId: user.telegramId,
      trafficLimitGB: plan?.trafficLimitGB || 0,
      expiryDays: remainingDays,
      maxDevices: plan?.maxDevices || 1,
    });

    // Delete from old server (best effort — client already has new connection)
    const oldServer = sub.server;
    const oldVpnClientId = sub.vpnClientId;
    const oldServerId = sub.serverId;

    await this.dataSource.transaction(async (manager) => {
      sub.serverId = newServer.id;
      sub.server = newServer;
      sub.vpnClientId = vpnClient.clientId;
      sub.vpnClientEmail = vpnClient.email;
      sub.connectionLink = vpnClient.connectionLink;
      await manager.save(sub);
    });

    await this.serverService.incrementClients(newServer.id);

    // Cleanup old server (fire-and-forget, non-critical)
    try {
      await this.vpnService.deleteClient(oldServer, oldVpnClientId);
      await this.serverService.decrementClients(oldServerId);
    } catch (e) {
      this.logger.warn(
        `Не удалось удалить клиента на старом сервере #${oldServerId}: ${e}`,
      );
    }

    this.logger.log(
      `Подписка #${sub.id} перенесена на сервер #${newServer.id}`,
    );
    return sub;
  }

  async updateExpiry(subscriptionId: number, expiresAt: Date): Promise<void> {
    await this.subRepo.update(subscriptionId, { expiresAt });
  }

  async getExpiringSubscriptions(
    daysBeforeExpiry: number,
  ): Promise<Subscription[]> {
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

  async extendSubscription(
    subscriptionId: number,
    days: number,
  ): Promise<Subscription> {
    const sub = await this.subRepo.findOne({
      where: { id: subscriptionId },
      relations: ['server'],
    });
    if (!sub) throw new NotFoundException('Подписка не найдена');

    // If expired, reactivate
    if (sub.status === SubscriptionStatus.EXPIRED) {
      await this.vpnService.toggleClient(
        sub.server,
        sub.vpnClientId,
        sub.vpnClientEmail,
        true,
      );
      sub.status = SubscriptionStatus.ACTIVE;
      sub.expiresAt = new Date();
      await this.serverService.incrementClients(sub.serverId);
    }

    sub.expiresAt = new Date(
      new Date(sub.expiresAt).getTime() + days * 86400000,
    );
    await this.subRepo.save(sub);

    this.logger.log(`Подписка #${sub.id} продлена на ${days} дн.`);
    return sub;
  }

  async getTrafficWarningSubscriptions(
    thresholdPercent = 80,
  ): Promise<Subscription[]> {
    return this.subRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.plan', 'plan')
      .innerJoinAndSelect('s.user', 'user')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('plan.trafficLimitGB > 0')
      .andWhere('s.trafficUsedGB >= plan.trafficLimitGB * :threshold / 100', {
        threshold: thresholdPercent,
      })
      .andWhere('s.trafficUsedGB < plan.trafficLimitGB')
      .getMany();
  }
}
