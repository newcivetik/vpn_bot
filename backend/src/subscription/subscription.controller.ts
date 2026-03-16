import { Controller, Get, Post, Body, Query, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
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
  ) {}

  @Get('plans')
  async getPlans() {
    return this.planService.findAll();
  }

  @Get('subscription')
  async getSubscription(@Query('initData') initData: string) {
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return null;

    const subscription =
      await this.subscriptionService.getActiveSubscription(user.id);
    return subscription;
  }

  @Get('subscriptions')
  async getSubscriptions(@Query('initData') initData: string) {
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return [];

    return this.subscriptionService.getAllSubscriptions(user.id);
  }

  @Post('create-invoice')
  async createInvoice(
    @Body() body: { planId: number; initData: string },
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
    );

    const bot = this.botService.getBot();
    const invoiceLink = await bot.api.createInvoiceLink(
      `VPN ${plan.name}`,
      `Подписка на ${plan.durationDays} дней`,
      String(payment.id),
      '',
      'XTR',
      [{ label: plan.name, amount: plan.priceStars }],
    );

    return { invoiceLink };
  }

  @Post('create-yokassa-payment')
  async createYokassaPayment(
    @Body() body: { planId: number; initData: string },
  ) {
    const telegramUser = this.validateAndExtractUser(body.initData);
    const plan = await this.planService.findById(body.planId);
    if (!plan) throw new UnauthorizedException('Тариф не найден');

    const user = await this.userService.findOrCreate({
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });

    const { confirmationToken } = await this.paymentService.createYokassaPayment(
      user.id,
      plan.id,
      plan.price,
      { embedded: true },
    );

    return { confirmationToken };
  }

  @Get('servers')
  async getServers() {
    return this.serverService.findAllActive();
  }

  @Post('subscription/change-server')
  async changeServer(
    @Body() body: { serverId: number; initData: string },
  ) {
    const telegramUser = this.validateAndExtractUser(body.initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const sub = await this.subscriptionService.getActiveSubscription(user.id);
    if (!sub) throw new UnauthorizedException('Нет активной подписки');

    await this.subscriptionService.changeServer(sub.id, body.serverId);
    const updated = await this.subscriptionService.getActiveSubscription(user.id);
    return updated;
  }

  @Post('validate-promo')
  async validatePromo(
    @Body() body: { code: string; initData: string },
  ) {
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
  async getProfile(@Query('initData') initData: string) {
    const telegramUser = this.validateAndExtractUser(initData);
    const user = await this.userService.findByTelegramId(telegramUser.id);
    if (!user) return null;

    const code = await this.userService.generateReferralCode(user.id);
    const referralCount = await this.userService.getReferralCount(user.id);

    return {
      referralCode: code,
      referralCount,
      referralBonusDays: user.referralBonusDays,
    };
  }

  private validateAndExtractUser(initData: string) {
    const botToken = process.env.BOT_TOKEN;
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
