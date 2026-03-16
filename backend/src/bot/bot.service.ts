import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, GrammyError, HttpError } from 'grammy';
import { UserService } from '../user/user.service';
import { PlanService } from '../plan/plan.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentService } from '../payment/payment.service';
import {
  mainMenuKeyboard,
  plansKeyboard,
  paymentMethodKeyboard,
  backToMenuKeyboard,
} from './bot.keyboards';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Bot;
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly planService: PlanService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
  ) {
    this.bot = new Bot(this.config.getOrThrow<string>('BOT_TOKEN'));
  }

  async onModuleInit() {
    this.registerHandlers();

    const webhookDomain = this.config.get<string>('WEBHOOK_DOMAIN');
    if (webhookDomain) {
      await this.bot.api.setWebhook(`${webhookDomain}/bot/webhook`);
      this.logger.log(`Webhook установлен: ${webhookDomain}/bot/webhook`);
    } else {
      // Long polling для разработки
      this.bot.start();
      this.logger.log('Бот запущен в режиме long polling');
    }
  }

  getBot(): Bot {
    return this.bot;
  }

  private registerHandlers() {
    const miniAppUrl = this.config.getOrThrow<string>('MINI_APP_URL');

    // /start
    this.bot.command('start', async (ctx) => {
      const from = ctx.from;
      if (!from) return;

      await this.userService.findOrCreate({
        telegramId: from.id,
        username: from.username,
        firstName: from.first_name,
        languageCode: from.language_code,
      });

      await ctx.reply(
        '👋 Добро пожаловать в VPN-сервис!\n\n' +
          '🔒 Быстрый, безопасный VPN с протоколом VLESS+Reality.\n' +
          'Трафик неотличим от обычного HTTPS.\n\n' +
          'Выберите действие:',
        { reply_markup: mainMenuKeyboard(miniAppUrl) },
      );
    });

    // /status
    this.bot.command('status', async (ctx) => {
      await this.handleStatus(ctx);
    });

    // /key
    this.bot.command('key', async (ctx) => {
      await this.handleKey(ctx);
    });

    // /help
    this.bot.command('help', async (ctx) => {
      await this.handleHelp(ctx);
    });

    // Callback queries
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data === 'menu') {
        await ctx.editMessageText(
          '🔒 VPN-сервис\n\nВыберите действие:',
          { reply_markup: mainMenuKeyboard(miniAppUrl) },
        );
      } else if (data === 'status') {
        await this.handleStatus(ctx);
      } else if (data === 'key') {
        await this.handleKey(ctx);
      } else if (data === 'help') {
        await this.handleHelp(ctx);
      } else if (data === 'plans') {
        const plans = await this.planService.findAll();
        await ctx.editMessageText(
          '📋 Тарифные планы:\n\nВыберите подходящий:',
          { reply_markup: plansKeyboard(plans) },
        );
      } else if (data.startsWith('buy_stars:')) {
        const planId = parseInt(data.split(':')[1]);
        await ctx.editMessageText(
          '💰 Выберите способ оплаты:',
          { reply_markup: paymentMethodKeyboard(planId) },
        );
      } else if (data.startsWith('pay_stars:')) {
        await this.handleStarsPayment(ctx, data);
      } else if (data.startsWith('pay_yokassa:')) {
        await this.handleYokassaPayment(ctx, data);
      }

      await ctx.answerCallbackQuery();
    });

    // Telegram Stars: pre_checkout_query
    this.bot.on('pre_checkout_query', async (ctx) => {
      await ctx.answerPreCheckoutQuery(true);
    });

    // Telegram Stars: successful_payment
    this.bot.on('message:successful_payment', async (ctx) => {
      const payment = ctx.message.successful_payment;
      const paymentId = parseInt(payment.invoice_payload);

      await this.paymentService.confirmStarsPayment(
        paymentId,
        payment.telegram_payment_charge_id,
      );

      const user = await this.userService.findByTelegramId(ctx.from.id);
      const sub = user
        ? await this.subscriptionService.getActiveSubscription(user.id)
        : null;

      await ctx.reply(
        '✅ Оплата прошла успешно!\n\n' +
          `🔑 Ваш ключ подключения:\n\n\`${sub?.connectionLink || 'Ошибка получения ключа'}\`\n\n` +
          'Скопируйте ключ и вставьте в приложение Hiddify.',
        {
          parse_mode: 'Markdown',
          reply_markup: backToMenuKeyboard(),
        },
      );
    });

    // Error handler
    this.bot.catch((err) => {
      const ctx = err.ctx;
      const e = err.error;
      if (e instanceof GrammyError) {
        this.logger.error(`Grammy error: ${e.description}`);
      } else if (e instanceof HttpError) {
        this.logger.error(`HTTP error: ${e}`);
      } else {
        this.logger.error(`Unknown error: ${e}`);
      }
    });
  }

  private async handleStatus(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    if (!user) {
      const text = '❌ У вас нет активной подписки.\n\nВыберите тариф:';
      const plans = await this.planService.findAll();
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: plansKeyboard(plans) });
      } else {
        await ctx.reply(text, { reply_markup: plansKeyboard(plans) });
      }
      return;
    }

    const sub = await this.subscriptionService.getActiveSubscription(user.id);
    if (!sub) {
      const text = '❌ У вас нет активной подписки.\n\nВыберите тариф:';
      const plans = await this.planService.findAll();
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: plansKeyboard(plans) });
      } else {
        await ctx.reply(text, { reply_markup: plansKeyboard(plans) });
      }
      return;
    }

    const expiresDate = new Date(sub.expiresAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const trafficLimit = sub.plan.trafficLimitGB > 0
      ? `${sub.trafficUsedGB} / ${sub.plan.trafficLimitGB} ГБ`
      : `${sub.trafficUsedGB} ГБ (безлимит)`;

    const text =
      `📊 Ваша подписка\n\n` +
      `📦 Тариф: ${sub.plan.name}\n` +
      `📅 Действует до: ${expiresDate}\n` +
      `📈 Трафик: ${trafficLimit}\n` +
      `🌍 Сервер: ${sub.server.location}`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { reply_markup: backToMenuKeyboard() });
    } else {
      await ctx.reply(text, { reply_markup: backToMenuKeyboard() });
    }
  }

  private async handleKey(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    if (!sub) {
      const text = '❌ У вас нет активной подписки.';
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: backToMenuKeyboard() });
      } else {
        await ctx.reply(text, { reply_markup: backToMenuKeyboard() });
      }
      return;
    }

    const text =
      `🔑 Ваш ключ подключения:\n\n` +
      `\`${sub.connectionLink}\`\n\n` +
      `Скопируйте и вставьте в приложение Hiddify.`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: backToMenuKeyboard(),
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: backToMenuKeyboard(),
      });
    }
  }

  private async handleHelp(ctx: any) {
    const text =
      '❓ Как подключиться:\n\n' +
      '1. Купите подписку через бота или Mini App\n' +
      '2. Скопируйте ключ подключения\n' +
      '3. Скачайте Hiddify:\n' +
      '   • iPhone: App Store → Hiddify\n' +
      '   • Android: Google Play → Hiddify\n' +
      '   • Windows/Mac: hiddify.com\n' +
      '4. Откройте Hiddify → нажмите + → вставьте ключ\n' +
      '5. Нажмите кнопку подключения\n\n' +
      '🔒 Протокол VLESS+Reality — трафик неотличим от обычного HTTPS.';

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { reply_markup: backToMenuKeyboard() });
    } else {
      await ctx.reply(text, { reply_markup: backToMenuKeyboard() });
    }
  }

  private async handleStarsPayment(ctx: any, data: string) {
    const planId = parseInt(data.split(':')[1]);
    const plan = await this.planService.findById(planId);
    if (!plan) return;

    const from = ctx.callbackQuery.from;
    const user = await this.userService.findOrCreate({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
    });

    const payment = await this.paymentService.createStarsPayment(
      user.id,
      plan.id,
      plan.priceStars,
    );

    await ctx.api.sendInvoice(from.id, `VPN ${plan.name}`, `Подписка на ${plan.durationDays} дней`, String(payment.id), 'XTR', [
      { label: plan.name, amount: plan.priceStars },
    ]);
  }

  private async handleYokassaPayment(ctx: any, data: string) {
    const planId = parseInt(data.split(':')[1]);
    const plan = await this.planService.findById(planId);
    if (!plan) return;

    const from = ctx.callbackQuery.from;
    const user = await this.userService.findOrCreate({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
    });

    try {
      const result = await this.paymentService.createYokassaPayment(
        user.id,
        plan.id,
        plan.price,
      );

      await ctx.editMessageText(
        `💳 Оплата тарифа "${plan.name}" — ${plan.price}₽\n\nНажмите кнопку для перехода к оплате:`,
        {
          reply_markup: new (await import('grammy')).InlineKeyboard()
            .url('Оплатить', result.confirmationUrl!)
            .row()
            .text('« Назад', 'menu'),
        },
      );
    } catch (e) {
      await ctx.editMessageText(
        '❌ Ошибка создания платежа. Попробуйте позже.',
        { reply_markup: backToMenuKeyboard() },
      );
    }
  }

  async sendNotification(telegramId: number, text: string): Promise<void> {
    try {
      await this.bot.api.sendMessage(telegramId, text);
    } catch (e) {
      this.logger.warn(`Не удалось отправить уведомление ${telegramId}: ${e}`);
    }
  }
}
