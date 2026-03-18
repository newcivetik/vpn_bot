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
import { VpnService } from '../vpn/vpn.service';
import { BotService } from '../bot/bot.service';
import { SubscriptionService } from '../subscription/subscription.service';

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
    private readonly vpnService: VpnService,
    private readonly botService: BotService,
    private readonly subscriptionService: SubscriptionService,
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

  // ─── Users ─────────────────────────────────────────────

  async getUsers(page: number, limit: number, search?: string) {
    let where: any = undefined;
    if (search) {
      where = [
        { username: Like(`%${search}%`) },
        { firstName: Like(`%${search}%`) },
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

  async grantSubscription(userId: number, planId: number) {
    const sub = await this.subscriptionService.createSubscription(
      userId,
      planId,
    );
    this.logger.log(
      `Admin granted subscription #${sub.id} to user #${userId}, plan #${planId}`,
    );
    return sub;
  }

  async extendSubscription(id: number, days: number) {
    const sub = await this.subRepo.findOne({
      where: { id },
      relations: ['server'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    const newExpiry = new Date(sub.expiresAt);
    newExpiry.setDate(newExpiry.getDate() + days);
    sub.expiresAt = newExpiry;

    if (sub.status === SubscriptionStatus.EXPIRED) {
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
    return sub;
  }

  async cancelSubscription(id: number) {
    const sub = await this.subRepo.findOne({
      where: { id },
      relations: ['server'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    sub.status = SubscriptionStatus.CANCELLED;
    await this.vpnService.toggleClient(
      sub.server,
      sub.vpnClientId,
      sub.vpnClientEmail,
      false,
    );
    await this.subRepo.save(sub);
    this.logger.log(`Subscription #${id} cancelled`);
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
    return this.serverRepo.find({ order: { id: 'ASC' } });
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
      // Try to login to 3X-UI panel
      const url = `https://${server.host}:${server.apiPort}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(server.username)}&password=${encodeURIComponent(server.password)}`,
        signal: AbortSignal.timeout(5000),
      });
      return { online: res.ok, clientCount: server.currentClients };
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

  // ─── Broadcast ────────────────────────────────────────

  async broadcastMessage(text: string, onlyActive: boolean) {
    let users: User[];

    if (onlyActive) {
      const activeSubs = await this.subRepo.find({
        where: { status: SubscriptionStatus.ACTIVE },
        relations: ['user'],
      });
      const userMap = new Map<number, User>();
      for (const sub of activeSubs) {
        userMap.set(sub.user.id, sub.user);
      }
      users = Array.from(userMap.values());
    } else {
      users = await this.userRepo.find();
    }

    let sent = 0;
    let failed = 0;

    // Telegram rate limit: ~30 messages per second
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
      // Pause between batches to respect Telegram rate limits
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Broadcast: sent ${sent}, failed ${failed}`);
    return { sent, failed, total: users.length };
  }
}
