import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Inject,
  forwardRef,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { PlanService } from '../plan/plan.service';
import { UserService } from '../user/user.service';
import { PaymentService } from '../payment/payment.service';
import { BotService } from '../bot/bot.service';
import { ServerService } from '../server/server.service';
import { PromoService } from '../promo/promo.service';
import { SupportService } from '../support/support.service';
import { validateTelegramWebAppData } from '../shared/guards/telegram-auth';

@Controller('api')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly serverService: ServerService,
    private readonly promoService: PromoService,
    @Inject(forwardRef(() => SupportService))
    private readonly supportService: SupportService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('plans')
  async getPlans() {
    return this.planService.findAll();
  }

  @Get('subscription')
  async getSubscription(
    @Headers('x-init-data') headerInitData: string,
    @Query('initData') queryInitData: string,
  ) {
    const initData = headerInitData || queryInitData;
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return null;

    const subscription = await this.subscriptionService.getActiveSubscription(
      user.id,
    );
    return subscription ? this.sanitizeSubscription(subscription) : null;
  }

  @Get('subscriptions')
  async getSubscriptions(
    @Headers('x-init-data') headerInitData: string,
    @Query('initData') queryInitData: string,
  ) {
    const initData = headerInitData || queryInitData;
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return [];

    return this.subscriptionService.getAllSubscriptions(user.id);
  }

  @Post('create-invoice')
  async createInvoice(
    @Headers('x-init-data') headerInitData: string,
    @Body() body: { planId: number; initData?: string; promoCode?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(
      headerInitData || body.initData || '',
    );
    const plan = await this.planService.findById(body.planId);
    if (!plan) throw new UnauthorizedException('Тариф не найден');

    const user = await this.userService.findOrCreate({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });

    const payment = await this.paymentService.createStarsPayment(
      user.id,
      plan.id,
      plan.priceStars,
      body.promoCode,
    );

    const bot = this.botService.getBot();
    const invoiceLink = await bot.api.createInvoiceLink(
      `VPN ${plan.name}`,
      `Подписка на ${plan.durationDays} дней`,
      String(payment.id),
      '',
      'XTR',
      [{ label: plan.name, amount: payment.amount }],
    );

    return { invoiceLink };
  }

  @Post('create-yokassa-payment')
  async createYokassaPayment(
    @Headers('x-init-data') headerInitData: string,
    @Body()
    body: {
      planId: number;
      initData?: string;
      promoCode?: string;
      embedded?: boolean;
    },
  ) {
    const telegramUser = this.validateAndExtractUser(
      headerInitData || body.initData || '',
    );
    const plan = await this.planService.findById(body.planId);
    if (!plan) throw new UnauthorizedException('Тариф не найден');

    const user = await this.userService.findOrCreate({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });

    const embedded = body.embedded !== false; // default true for backward compat

    const result = await this.paymentService.createYokassaPayment(
      user.id,
      plan.id,
      plan.price,
      { embedded, promoCode: body.promoCode },
    );

    if (embedded) {
      return { confirmationToken: result.confirmationToken };
    } else {
      return { confirmationUrl: result.confirmationUrl };
    }
  }

  @Get('servers')
  async getServers() {
    const servers = await this.serverService.findAllActive();
    const best = servers[0]; // already sorted by currentClients ASC
    return servers.map((s) => ({
      id: s.id,
      location: s.location,
      maxClients: s.maxClients,
      currentClients: s.currentClients,
      isActive: s.isActive,
      recommended: s.id === best?.id,
    }));
  }

  @Post('subscription/change-server')
  async changeServer(
    @Headers('x-init-data') headerInitData: string,
    @Body() body: { serverId: number; initData?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(
      headerInitData || body.initData || '',
    );
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const sub = await this.subscriptionService.getActiveSubscription(user.id);
    if (!sub) throw new UnauthorizedException('Нет активной подписки');

    await this.subscriptionService.changeServer(sub.id, body.serverId);
    const updated = await this.subscriptionService.getActiveSubscription(
      user.id,
    );
    return updated ? this.sanitizeSubscription(updated) : null;
  }

  @Post('validate-promo')
  async validatePromo(
    @Headers('x-init-data') headerInitData: string,
    @Body() body: { code: string; initData?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(
      headerInitData || body.initData || '',
    );
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const result = await this.promoService.validatePromo(body.code, user.id);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    return {
      valid: true,
      discountPercent: result.promo!.discountPercent,
      bonusDays: result.promo!.bonusDays,
    };
  }

  @Get('profile')
  async getProfile(
    @Headers('x-init-data') headerInitData: string,
    @Query('initData') queryInitData: string,
  ) {
    const initData = headerInitData || queryInitData;
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return null;

    const code = await this.userService.generateReferralCode(user.id);
    const referralCount = await this.userService.getReferralCount(user.id);

    // Check if user has had any subscriptions (for renewal discount badge)
    const allSubs = await this.subscriptionService.getAllSubscriptions(user.id);
    const isReturning = allSubs.length > 0;

    return {
      referralCode: code,
      referralCount,
      referralBonusDays: user.referralBonusDays,
      isReturning,
      totalSubscriptions: allSubs.length,
      notifyBeforeExpiry: user.notifyBeforeExpiry,
      botUsername: this.botService.getBotUsername(),
    };
  }

  @Post('profile/notifications')
  async toggleNotifications(
    @Headers('x-init-data') headerInitData: string,
    @Body() body: { enabled: boolean; initData?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(
      headerInitData || body.initData || '',
    );
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    await this.userService.updateNotifyPreference(user.id, body.enabled);
    return { notifyBeforeExpiry: body.enabled };
  }

  @Get('personal-discount')
  async getPersonalDiscount(
    @Headers('x-init-data') headerInitData: string,
    @Query('initData') queryInitData: string,
  ) {
    const initData = headerInitData || queryInitData;
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return null;

    const discount = await this.promoService.getActiveDiscount(user.id);
    if (!discount) return null;

    return {
      id: discount.id,
      discountPercent: discount.discountPercent,
      bonusDays: discount.bonusDays,
      reason: discount.reason,
      expiresAt: discount.expiresAt,
    };
  }

  // ─── Support (mini-app) ──────────────────────────────

  @Get('support/ticket')
  async getSupportTicket(
    @Headers('x-init-data') headerInitData: string,
    @Query('initData') queryInitData: string,
  ) {
    const initData = headerInitData || queryInitData;
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return null;

    const ticket = await this.supportService.getUserTicketWithMessages(user.id);
    return ticket;
  }

  @Post('support/ticket')
  async sendSupportMessage(
    @Headers('x-init-data') headerInitData: string,
    @Body() body: { text: string; initData?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(
      headerInitData || body.initData || '',
    );
    const user = await this.userService.findOrCreate({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });

    const result = await this.supportService.addUserMessage(user.id, body.text);
    return result;
  }

  private sanitizeSubscription(sub: any) {
    const { server, ...rest } = sub;
    return {
      ...rest,
      server: server
        ? {
            id: server.id,
            location: server.location,
            maxClients: server.maxClients,
            currentClients: server.currentClients,
            isActive: server.isActive,
          }
        : undefined,
    };
  }

  private validateAndExtractUser(initData: string) {
    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken || !initData) {
      throw new UnauthorizedException('Неверные данные авторизации');
    }

    const userData = validateTelegramWebAppData(initData, botToken);
    if (!userData) {
      throw new UnauthorizedException('Невалидная подпись Telegram');
    }

    return userData;
  }
}
