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
    private readonly configService: ConfigService,
  ) {}

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
    @Body() body: { planId: number; initData: string; promoCode?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(body.initData);
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
    @Body() body: { planId: number; initData: string; promoCode?: string },
  ) {
    const telegramUser = this.validateAndExtractUser(body.initData);
    const plan = await this.planService.findById(body.planId);
    if (!plan) throw new UnauthorizedException('Тариф не найден');

    const user = await this.userService.findOrCreate({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });

    const { confirmationToken } =
      await this.paymentService.createYokassaPayment(
        user.id,
        plan.id,
        plan.price,
        { embedded: true, promoCode: body.promoCode },
      );

    return { confirmationToken };
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
  async changeServer(@Body() body: { serverId: number; initData: string }) {
    const telegramUser = this.validateAndExtractUser(body.initData);
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
  async validatePromo(@Body() body: { code: string; initData: string }) {
    const telegramUser = this.validateAndExtractUser(body.initData);
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
    };
  }

  @Post('profile/notifications')
  async toggleNotifications(
    @Body() body: { enabled: boolean; initData: string },
  ) {
    const telegramUser = this.validateAndExtractUser(body.initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    await this.userService.updateNotifyPreference(user.id, body.enabled);
    return { notifyBeforeExpiry: body.enabled };
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
