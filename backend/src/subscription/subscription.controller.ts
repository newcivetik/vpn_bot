import { Controller, Get, Post, Body, Query, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PlanService } from '../plan/plan.service';
import { UserService } from '../user/user.service';
import { PaymentService } from '../payment/payment.service';
import { BotService } from '../bot/bot.service';
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
