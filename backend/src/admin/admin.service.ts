import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { User } from '../user/user.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscription/subscription.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../payment/payment.entity';
import { Plan } from '../plan/plan.entity';
import { Server } from '../server/server.entity';
import { PromoCode } from '../promo/promo.entity';
import { AdminLog } from './admin-log.entity';
import { AdminSettings } from './admin-settings.entity';
import { VpnService } from '../vpn/vpn.service';
import { BotService } from '../bot/bot.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ServerService } from '../server/server.service';
import { PromoService } from '../promo/promo.service';
import { messages } from '../bot/bot.messages';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Server) private readonly serverRepo: Repository<Server>,
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(AdminLog)
    private readonly logRepo: Repository<AdminLog>,
    @InjectRepository(AdminSettings)
    private readonly settingsRepo: Repository<AdminSettings>,
    private readonly vpnService: VpnService,
    private readonly botService: BotService,
    private readonly subscriptionService: SubscriptionService,
    private readonly serverService: ServerService,
    private readonly promoService: PromoService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);
    const in3Days = new Date(todayStart);
    in3Days.setDate(in3Days.getDate() + 3);

    const [
      totalUsers,
      totalActiveSubscriptions,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeServers,
      expiringIn3Days,
    ] = await Promise.all([
      this.userRepo.count(),
      this.subRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.userRepo.count({
        where: { createdAt: MoreThanOrEqual(todayStart) },
      }),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(weekStart) } }),
      this.userRepo.count({
        where: { createdAt: MoreThanOrEqual(monthStart) },
      }),
      this.serverRepo.count({ where: { isActive: true } }),
      this.subRepo.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: Between(now, in3Days),
        },
      }),
    ]);

    // Revenue
    const revenueResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('p.method', 'method')
      .addSelect('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .groupBy('p.method')
      .getRawMany();

    let totalRevenueStars = 0;
    let totalRevenueRubles = 0;
    for (const row of revenueResult) {
      if (row.method === PaymentMethod.STARS)
        totalRevenueStars = Number(row.total);
      else totalRevenueRubles = Number(row.total);
    }

    // Conversion rate: users who ever had a subscription
    const usersWithSubs = await this.subRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.userId)', 'cnt')
      .getRawOne();
    const conversionRate =
      totalUsers > 0
        ? Math.round((Number(usersWithSubs.cnt) / totalUsers) * 100)
        : 0;

    // Churn: expired in last 7 days
    const churnedWeek = await this.subRepo.count({
      where: {
        status: SubscriptionStatus.EXPIRED,
        expiresAt: Between(weekStart, now),
      },
    });

    return {
      totalUsers,
      totalActiveSubscriptions,
      totalRevenueRubles,
      totalRevenueStars,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeServers,
      expiringIn3Days,
      conversionRate,
      churnedWeek,
    };
  }

  async getRevenueChart(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.paymentRepo
      .createQueryBuilder('p')
      .select("TO_CHAR(p.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('p.method', 'method')
      .addSelect('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('p.createdAt >= :since', { since })
      .groupBy("TO_CHAR(p.createdAt, 'YYYY-MM-DD')")
      .addGroupBy('p.method')
      .orderBy('date')
      .getRawMany();

    const map = new Map<
      string,
      { date: string; stars: number; rubles: number }
    >();
    for (const row of rows) {
      if (!map.has(row.date)) {
        map.set(row.date, { date: row.date, stars: 0, rubles: 0 });
      }
      const entry = map.get(row.date)!;
      if (row.method === PaymentMethod.STARS) entry.stars = Number(row.total);
      else entry.rubles = Number(row.total);
    }

    return Array.from(map.values());
  }

  async getUserGrowthChart(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.userRepo
      .createQueryBuilder('u')
      .select("TO_CHAR(u.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('u.createdAt >= :since', { since })
      .groupBy("TO_CHAR(u.createdAt, 'YYYY-MM-DD')")
      .orderBy('date')
      .getRawMany()
      .then((rows) =>
        rows.map((r) => ({ date: r.date, count: Number(r.count) })),
      );
  }

  async getSubscriptionChart(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.subRepo
      .createQueryBuilder('s')
      .select("TO_CHAR(s.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN s.status = '${SubscriptionStatus.ACTIVE}' THEN 1 ELSE 0 END)`,
        'active',
      )
      .where('s.createdAt >= :since', { since })
      .groupBy("TO_CHAR(s.createdAt, 'YYYY-MM-DD')")
      .orderBy('date')
      .getRawMany();

    return rows.map((r) => ({
      date: r.date,
      total: Number(r.total),
      active: Number(r.active),
    }));
  }

  // ─── Users ─────────────────────────────────────────────

  async getUsers(page: number, limit: number, search?: string) {
    let where: any = undefined;
    if (search) {
      // Escape SQL LIKE special characters
      const escaped = search
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      where = [
        { username: Like(`%${escaped}%`) },
        { firstName: Like(`%${escaped}%`) },
      ];
      const num = Number(search);
      if (!isNaN(num)) {
        where.push({ telegramId: num });
        where.push({ id: num });
      }
    }

    const [data, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getUserById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: [
        'subscriptions',
        'subscriptions.plan',
        'subscriptions.server',
        'payments',
      ],
    });
    if (!user) return null;

    const referralCount = await this.userRepo.count({
      where: { referrerId: id },
    });

    const referrals = await this.userRepo.find({
      where: { referrerId: id },
      select: ['id', 'telegramId', 'username', 'firstName', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return { ...user, referralCount, referrals };
  }

  // ─── Subscriptions ────────────────────────────────────

  async getSubscriptions(
    page: number,
    limit: number,
    status?: string,
    userId?: number,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [data, total] = await this.subRepo.findAndCount({
      where,
      relations: ['user', 'plan', 'server'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async grantSubscription(userId: number, planId: number, notify = true) {
    const sub = await this.subscriptionService.createSubscription(
      userId,
      planId,
    );

    if (notify) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      const plan = await this.planRepo.findOne({ where: { id: planId } });
      if (user && plan) {
        const expiresDate = new Date(sub.expiresAt).toLocaleDateString(
          'ru-RU',
          {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          },
        );
        this.botService
          .sendNotification(
            user.telegramId,
            `🎁 Вам выдана подписка!\n\n` +
              `▸ Тариф: ${plan.name}\n` +
              `▸ Активна до: ${expiresDate}\n\n` +
              `Скопируй ключ командой /key и подключайся!`,
          )
          .catch(() => {});
      }
    }

    this.logger.log(
      `Admin granted subscription #${sub.id} to user #${userId}, plan #${planId}`,
    );
    return sub;
  }

  async extendSubscription(id: number, days: number, notify = true) {
    const sub = await this.subRepo.findOne({
      where: { id },
      relations: ['server', 'user', 'plan'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    const wasInactive =
      sub.status === SubscriptionStatus.EXPIRED ||
      sub.status === SubscriptionStatus.CANCELLED;

    // If subscription was inactive, extend from now; otherwise from current expiry
    const base = wasInactive ? new Date() : new Date(sub.expiresAt);
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + days);
    sub.expiresAt = newExpiry;

    if (wasInactive) {
      sub.status = SubscriptionStatus.ACTIVE;
      await this.vpnService.toggleClient(
        sub.server,
        sub.vpnClientId,
        sub.vpnClientEmail,
        true,
      );
    }

    await this.subRepo.save(sub);
    this.logger.log(`Subscription #${id} extended by ${days} days`);

    if (notify && sub.user) {
      const expiresDate = new Date(newExpiry).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      this.botService
        .sendNotification(
          sub.user.telegramId,
          `✅ Подписка продлена!\n\n` +
            `▸ Тариф: ${sub.plan?.name || '—'}\n` +
            `▸ +${days} дн.\n` +
            `▸ Активна до: ${expiresDate}`,
        )
        .catch(() => {});
    }

    return sub;
  }

  async cancelSubscription(id: number, notify = true) {
    const sub = await this.subRepo.findOne({
      where: { id },
      relations: ['server', 'user', 'plan'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    // Only disable VPN client if subscription was active
    if (sub.status === SubscriptionStatus.ACTIVE) {
      try {
        await this.vpnService.toggleClient(
          sub.server,
          sub.vpnClientId,
          sub.vpnClientEmail,
          false,
        );
        await this.serverService.decrementClients(sub.serverId);
      } catch (e) {
        this.logger.warn(`Failed to disable VPN client for sub #${id}: ${e}`);
      }
    }

    sub.status = SubscriptionStatus.CANCELLED;
    await this.subRepo.save(sub);
    this.logger.log(`Subscription #${id} cancelled`);

    if (notify && sub.user) {
      this.botService
        .sendNotification(
          sub.user.telegramId,
          `❌ Подписка отменена\n\n` +
            `▸ Тариф: ${sub.plan?.name || '—'}\n\n` +
            `VPN-соединение отключено. Оформи новую подписку, чтобы продолжить.`,
        )
        .catch(() => {});
    }

    return sub;
  }

  async recreateSubscription(id: number) {
    const sub = await this.subRepo.findOne({
      where: { id },
      relations: ['server', 'user', 'plan'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new NotFoundException('Subscription is not active');
    }

    const remainingMs = new Date(sub.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      throw new NotFoundException('Subscription already expired');
    }

    const remainingDays = Math.max(1, Math.ceil(remainingMs / 86400000));
    const oldClientId = sub.vpnClientId;

    // Delete broken client from 3X-UI
    try {
      await this.vpnService.deleteClient(sub.server, oldClientId);
    } catch (e) {
      this.logger.warn(`Failed to delete old client ${oldClientId}: ${e}`);
    }

    // Create fresh client
    const vpnClient = await this.vpnService.createClient(sub.server, {
      telegramId: sub.user.telegramId,
      trafficLimitGB: sub.plan.trafficLimitGB,
      expiryDays: remainingDays,
      maxDevices: sub.plan.maxDevices,
    });

    // Update subscription record
    sub.vpnClientId = vpnClient.clientId;
    sub.vpnClientEmail = vpnClient.email;
    sub.connectionLink = vpnClient.connectionLink;
    sub.trafficUsedGB = 0;
    await this.subRepo.save(sub);

    // Send new key to user
    try {
      await this.botService.sendNotification(
        sub.user.telegramId,
        messages.key(vpnClient.connectionLink),
      );
    } catch (e) {
      this.logger.warn(`Failed to send new key to user #${sub.userId}: ${e}`);
    }

    this.logger.log(
      `Subscription #${id} recreated: old client ${oldClientId} → new ${vpnClient.clientId}`,
    );
    return sub;
  }

  // ─── Plans ────────────────────────────────────────────

  async getAllPlans() {
    return this.planRepo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async createPlan(dto: any) {
    const plan = this.planRepo.create(dto);
    return this.planRepo.save(plan);
  }

  async updatePlan(id: number, dto: any) {
    await this.planRepo.update(id, dto);
    return this.planRepo.findOne({ where: { id } });
  }

  async deletePlan(id: number) {
    await this.planRepo.update(id, { isActive: false });
  }

  // ─── Servers ──────────────────────────────────────────

  async getAllServers() {
    return this.serverRepo.find({
      select: [
        'id',
        'name',
        'host',
        'port',
        'apiPort',
        'username',
        'inboundId',
        'location',
        'maxClients',
        'currentClients',
        'isActive',
      ],
      order: { id: 'ASC' },
    });
  }

  async createServer(dto: any) {
    const server = this.serverRepo.create(dto);
    return this.serverRepo.save(server);
  }

  async updateServer(id: number, dto: any) {
    await this.serverRepo.update(id, dto);
    return this.serverRepo.findOne({ where: { id } });
  }

  async deleteServer(id: number) {
    await this.serverRepo.update(id, { isActive: false });
  }

  async getServerHealth(id: number) {
    const server = await this.serverRepo.findOne({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');

    try {
      const url = `https://${server.host}:${server.apiPort}/`;
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return {
        online: res.ok || res.status === 302,
        clientCount: server.currentClients,
      };
    } catch {
      return { online: false, clientCount: server.currentClients };
    }
  }

  // ─── Payments ─────────────────────────────────────────

  async getPayments(
    page: number,
    limit: number,
    status?: string,
    method?: string,
    userId?: number,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (userId) where.userId = userId;

    const [data, total] = await this.paymentRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  // ─── Promo Codes ──────────────────────────────────────

  async getAllPromos(page: number, limit: number) {
    const [data, total] = await this.promoRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async createPromo(dto: any) {
    const promo = this.promoRepo.create({
      ...dto,
      code: dto.code.toUpperCase(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.promoRepo.save(promo);
  }

  async updatePromo(id: number, dto: any) {
    const update: any = { ...dto };
    if (dto.code) update.code = dto.code.toUpperCase();
    if (dto.expiresAt) update.expiresAt = new Date(dto.expiresAt);
    await this.promoRepo.update(id, update);
    return this.promoRepo.findOne({ where: { id } });
  }

  async deletePromo(id: number) {
    await this.promoRepo.update(id, { isActive: false });
  }

  // ─── Personal Discounts ──────────────────────────────

  async getPersonalDiscounts(page: number, limit: number, userId?: number) {
    return this.promoService.getPersonalDiscounts(page, limit, userId);
  }

  async createPersonalDiscount(dto: {
    userId: number;
    discountPercent?: number;
    bonusDays?: number;
    reason?: string;
    expiresAt?: string;
  }) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const discount = await this.promoService.createPersonalDiscount(
      dto.userId,
      dto.discountPercent || 0,
      dto.bonusDays || 0,
      dto.reason,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );

    // Send notification to user
    try {
      const expiresDate = dto.expiresAt
        ? new Date(dto.expiresAt).toLocaleDateString('ru-RU')
        : undefined;
      await this.botService.sendNotification(
        user.telegramId,
        messages.personalDiscountNotification(
          dto.discountPercent || 0,
          dto.bonusDays || 0,
          dto.reason,
          expiresDate,
        ),
      );
    } catch (e) {
      this.logger.error(`Ошибка отправки уведомления о скидке: ${e}`);
    }

    this.logger.log(
      `Персональная скидка создана для пользователя #${dto.userId}`,
    );
    return discount;
  }

  async deletePersonalDiscount(id: number) {
    await this.promoService.deletePersonalDiscount(id);
  }

  // ─── Broadcast ────────────────────────────────────────

  async broadcastMessage(text: string, onlyActive: boolean) {
    let sent = 0;
    let failed = 0;
    let total = 0;
    const pageSize = 100;

    if (onlyActive) {
      // Paginated query for active subscriptions
      let page = 0;
      const seenUserIds = new Set<number>();
      while (true) {
        const activeSubs = await this.subRepo.find({
          where: { status: SubscriptionStatus.ACTIVE },
          relations: ['user'],
          skip: page * pageSize,
          take: pageSize,
        });
        if (activeSubs.length === 0) break;

        const uniqueUsers: User[] = [];
        for (const sub of activeSubs) {
          if (!seenUserIds.has(sub.user.id)) {
            seenUserIds.add(sub.user.id);
            uniqueUsers.push(sub.user);
          }
        }

        const res = await this.sendBatch(uniqueUsers, text);
        sent += res.sent;
        failed += res.failed;
        total += uniqueUsers.length;
        page++;
      }
    } else {
      let page = 0;
      while (true) {
        const users = await this.userRepo.find({
          skip: page * pageSize,
          take: pageSize,
        });
        if (users.length === 0) break;

        const res = await this.sendBatch(users, text);
        sent += res.sent;
        failed += res.failed;
        total += users.length;
        page++;
      }
    }

    this.logger.log(`Broadcast: sent ${sent}, failed ${failed}`);
    return { sent, failed, total };
  }

  private async sendBatch(
    users: User[],
    text: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    const batchSize = 25;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((user) =>
          this.botService.sendNotification(user.telegramId, text),
        ),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') sent++;
        else failed++;
      }
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { sent, failed };
  }

  // ─── Channel Posts ──────────────────────────────────

  async postToChannel(text: string): Promise<boolean> {
    return this.botService.postToChannel(text);
  }

  // ─── Admin Logs ─────────────────────────────────────

  async logAction(
    action: string,
    details?: Record<string, any>,
    ip?: string,
  ): Promise<void> {
    const log = this.logRepo.create({ action, details, ip });
    await this.logRepo.save(log);
  }

  async getActionLogs(page: number, limit: number) {
    const [data, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  // ─── Funnel Analytics ──────────────────────────────

  async getFunnelAnalytics(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Users registered in period
    const registered = await this.userRepo.count({
      where: { createdAt: MoreThanOrEqual(since) },
    });

    // Users who made at least one payment (purchased)
    const purchasedResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p.userId)', 'cnt')
      .innerJoin('users', 'u', 'u.id = p.userId')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('u.createdAt >= :since', { since })
      .getRawOne();
    const purchased = Number(purchasedResult?.cnt || 0);

    // Users who made 2+ payments (renewed)
    const renewedResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'cnt')
      .from((qb) => {
        return qb
          .select('p2.userId')
          .from(Payment, 'p2')
          .innerJoin('users', 'u', 'u.id = p2.userId')
          .where('p2.status = :status', { status: PaymentStatus.PAID })
          .andWhere('u.createdAt >= :since', { since })
          .groupBy('p2.userId')
          .having('COUNT(p2.id) >= 2');
      }, 'renewers')
      .getRawOne();
    const renewed = Number(renewedResult?.cnt || 0);

    const conversionRate =
      registered > 0 ? Math.round((purchased / registered) * 100) : 0;
    const retentionRate =
      purchased > 0 ? Math.round((renewed / purchased) * 100) : 0;

    return {
      registered,
      purchased,
      renewed,
      conversionRate,
      retentionRate,
    };
  }

  // ─── 2FA / TOTP ───────────────────────────────────────

  async getAdminSettings(): Promise<AdminSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({ id: 1, totpEnabled: false });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async setupTotp(): Promise<{ secret: string; uri: string }> {
    const { TOTP, Secret } = await import('otpauth');
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      issuer: 'SellWhyVPN',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const uri = totp.toString();
    // Store the secret temporarily (not enabled yet)
    const settings = await this.getAdminSettings();
    settings.totpSecret = secret.base32;
    await this.settingsRepo.save(settings);
    return { secret: secret.base32, uri };
  }

  async enableTotp(code: string): Promise<boolean> {
    const settings = await this.getAdminSettings();
    if (!settings.totpSecret) return false;
    const valid = await this.verifyTotp(settings.totpSecret, code);
    if (!valid) return false;
    settings.totpEnabled = true;
    await this.settingsRepo.save(settings);
    return true;
  }

  async disableTotp(code: string): Promise<boolean> {
    const settings = await this.getAdminSettings();
    if (!settings.totpSecret || !settings.totpEnabled) return false;
    const valid = await this.verifyTotp(settings.totpSecret, code);
    if (!valid) return false;
    settings.totpEnabled = false;
    settings.totpSecret = null;
    await this.settingsRepo.save(settings);
    return true;
  }

  async verifyTotp(secret: string, code: string): Promise<boolean> {
    const { TOTP, Secret } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'SellWhyVPN',
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }
}
