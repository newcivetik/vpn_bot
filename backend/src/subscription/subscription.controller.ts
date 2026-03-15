import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PlanService } from '../plan/plan.service';
import { UserService } from '../user/user.service';
import { validateTelegramWebAppData } from '../shared/guards/telegram-auth';

@Controller('api')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
    private readonly userService: UserService,
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
