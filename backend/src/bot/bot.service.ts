import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { UserService } from '../user/user.service';
import { PlanService } from '../plan/plan.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentService } from '../payment/payment.service';
import { ServerService } from '../server/server.service';
import { PromoService } from '../promo/promo.service';
import { messages } from './bot.messages';
import {
  mainMenuKeyboard,
  plansKeyboard,
  paymentMethodKeyboard,
  backToMenuKeyboard,
  serverKeyboard,
} from './bot.keyboards';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private bot: Bot;
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly planService: PlanService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly serverService: ServerService,
    private readonly promoService: PromoService,
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
      this.bot.start();
      this.logger.log('Бот запущен в режиме long polling');
    }
  }

  async onModuleDestroy() {
    await this.bot.stop();
    this.logger.log('Бот остановлен');
  }

  getBot(): Bot {
    return this.bot;
  }

  private registerHandlers() {
    const miniAppUrl = this.config.getOrThrow<string>('MINI_APP_URL');

    // /start (with referral deep-link support: /start ref_XXXXXXXX)
    this.bot.command('start', async (ctx) => {
      const from = ctx.from;
      if (!from) return;

      const user = await this.userService.findOrCreate({
        telegramId: from.id,
        username: from.username,
        firstName: from.first_name,
        languageCode: from.language_code,
      });

      // Parse referral code from deep-link
      const payload = ctx.match;
      if (payload && payload.startsWith('ref_')) {
        const refCode = payload.slice(4);
        const referrer = await this.userService.findByReferralCode(refCode);
        if (referrer && referrer.id !== user.id) {
          await this.userService.setReferrer(user.id, referrer.id);
          this.logger.log(`User #${user.id} referred by #${referrer.id}`);
        }
      }

      // New users get onboarding, returning users get welcome
      const activeSub = await this.subscriptionService.getActiveSubscription(
        user.id,
      );
      const message = activeSub
        ? messages.welcome(from.first_name)
        : messages.onboarding(from.first_name);

      await ctx.reply(message, {
        reply_markup: mainMenuKeyboard(miniAppUrl),
      });
    });

    // /status
    this.bot.command('status', (ctx) => this.handleStatus(ctx));

    // /key
    this.bot.command('key', (ctx) => this.handleKey(ctx));

    // /help
    this.bot.command('help', (ctx) => this.handleHelp(ctx));

    // /server
    this.bot.command('server', (ctx) => this.handleServer(ctx));

    // /traffic
    this.bot.command('traffic', (ctx) => this.handleTraffic(ctx));

    // /promo
    this.bot.command('promo', async (ctx) => {
      const code = ctx.match;
      if (!code) {
        await ctx.reply('Введи промокод после команды:\n/promo КОД');
        return;
      }
      const from = ctx.from;
      if (!from) return;

      const user = await this.userService.findOrCreate({
        telegramId: from.id,
        username: from.username,
        firstName: from.first_name,
      });

      const result = await this.promoService.validatePromo(code, user.id);
      if (!result.valid) {
        await ctx.reply(`❌ ${result.error}`);
        return;
      }

      const promo = result.promo!;
      let text = '✅ Промокод активен!\n\n';
      if (promo.discountPercent > 0)
        text += `💰 Скидка: ${promo.discountPercent}%\n`;
      if (promo.bonusDays > 0) text += `🎁 Бонус: +${promo.bonusDays} дней\n`;
      text += '\nПримени его при оплате в мини-приложении 🛒';

      await ctx.reply(text);
    });

    // /referral — получить свою реферальную ссылку
    this.bot.command('referral', async (ctx) => {
      const from = ctx.from;
      if (!from) return;

      const user = await this.userService.findOrCreate({
        telegramId: from.id,
        username: from.username,
        firstName: from.first_name,
      });

      const code = await this.userService.generateReferralCode(user.id);
      const botUsername = this.bot.botInfo?.username || 'bot';
      const link = `https://t.me/${botUsername}?start=ref_${code}`;
      const count = await this.userService.getReferralCount(user.id);

      await ctx.reply(
        `🤝 Твоя реферальная ссылка:\n\n\`${link}\`\n\n` +
          `👥 Приглашено: ${count}\n` +
          `🎁 За каждого друга — ${this.config.get('REFERRAL_BONUS_DAYS', 3)} бонусных дня!\n\n` +
          `Отправь ссылку друзьям 👇`,
        { parse_mode: 'Markdown' },
      );
    });

    // Inline query — share referral link
    this.bot.on('inline_query', async (ctx) => {
      const from = ctx.inlineQuery.from;
      const user = await this.userService.findByTelegramId(from.id);
      if (!user) {
        await ctx.answerInlineQuery([]);
        return;
      }

      const code = await this.userService.generateReferralCode(user.id);
      const botUsername = this.bot.botInfo?.username || 'bot';
      const link = `https://t.me/${botUsername}?start=ref_${code}`;

      await ctx.answerInlineQuery(
        [
          {
            type: 'article',
            id: 'referral',
            title: '🤝 Поделиться VPN',
            description: 'Отправить реферальную ссылку',
            input_message_content: {
              message_text:
                `🛡 Быстрый и безопасный VPN!\n\n` +
                `Подключайся по моей ссылке и получи бонус:\n${link}`,
            },
          },
        ],
        { cache_time: 60 },
      );
    });

    // Callback queries
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data === 'menu') {
        await ctx.editMessageText(messages.menu, {
          reply_markup: mainMenuKeyboard(miniAppUrl),
        });
      } else if (data === 'status') {
        await this.handleStatus(ctx);
      } else if (data === 'key') {
        await this.handleKey(ctx);
      } else if (data === 'help') {
        await this.handleHelp(ctx);
      } else if (data === 'server') {
        await this.handleServer(ctx);
      } else if (data === 'plans') {
        const plans = await this.planService.findAll();
        await ctx.editMessageText(messages.plans, {
          reply_markup: plansKeyboard(plans),
        });
      } else if (data.startsWith('buy_stars:')) {
        const planId = parseInt(data.split(':')[1]);
        await ctx.editMessageText(messages.selectPayment, {
          reply_markup: paymentMethodKeyboard(planId),
        });
      } else if (data.startsWith('pay_stars:')) {
        await this.handleStarsPayment(ctx, data);
      } else if (data.startsWith('pay_yokassa:')) {
        await this.handleYokassaPayment(ctx, data);
      } else if (data.startsWith('change_server:')) {
        await this.handleChangeServer(ctx, data);
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
        messages.paymentSuccess(
          sub?.connectionLink || 'Ошибка получения ключа',
        ),
        {
          parse_mode: 'Markdown',
          reply_markup: backToMenuKeyboard(),
        },
      );
    });

    // Error handler
    this.bot.catch((err) => {
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

  /** Send reply or edit depending on context */
  private async sendOrEdit(
    ctx: any,
    text: string,
    keyboard: InlineKeyboard,
    parseMode?: string,
  ) {
    const opts: any = { reply_markup: keyboard };
    if (parseMode) opts.parse_mode = parseMode;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, opts);
    } else {
      await ctx.reply(text, opts);
    }
  }

  private async handleStatus(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    if (!sub) {
      const plans = await this.planService.findAll();
      await this.sendOrEdit(ctx, messages.noSubscription, plansKeyboard(plans));
      return;
    }

    const expiresDate = new Date(sub.expiresAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const trafficLimit =
      sub.plan.trafficLimitGB > 0
        ? `${sub.trafficUsedGB} / ${sub.plan.trafficLimitGB} ГБ`
        : `${sub.trafficUsedGB} ГБ (безлимит)`;

    await this.sendOrEdit(
      ctx,
      messages.status(
        sub.plan.name,
        expiresDate,
        trafficLimit,
        sub.server.location,
      ),
      backToMenuKeyboard(),
    );
  }

  private async handleKey(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    if (!sub) {
      await this.sendOrEdit(ctx, messages.noKey, backToMenuKeyboard());
      return;
    }

    await this.sendOrEdit(
      ctx,
      messages.key(sub.connectionLink),
      backToMenuKeyboard(),
      'Markdown',
    );
  }

  private async handleHelp(ctx: any) {
    await this.sendOrEdit(ctx, messages.help, backToMenuKeyboard());
  }

  private async handleTraffic(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    if (!sub) {
      await this.sendOrEdit(ctx, messages.noSubscription, backToMenuKeyboard());
      return;
    }

    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000),
    );

    await this.sendOrEdit(
      ctx,
      messages.trafficStatus(
        sub.plan.name,
        Number(sub.trafficUsedGB),
        sub.plan.trafficLimitGB,
        daysLeft,
      ),
      backToMenuKeyboard(),
    );
  }

  private async handleServer(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    if (!sub) {
      await this.sendOrEdit(ctx, messages.noSubscription, backToMenuKeyboard());
      return;
    }

    const servers = await this.serverService.findAllActive();
    await this.sendOrEdit(
      ctx,
      messages.serverSelect,
      serverKeyboard(servers, sub.serverId),
    );
  }

  private async handleChangeServer(ctx: any, data: string) {
    const newServerId = parseInt(data.split(':')[1]);
    const from = ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    if (!sub) {
      await ctx.editMessageText(messages.noSubscription, {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    if (sub.serverId === newServerId) {
      await ctx.answerCallbackQuery({ text: 'Ты уже на этом сервере' });
      return;
    }

    try {
      await this.subscriptionService.changeServer(sub.id, newServerId);
      const server = await this.serverService.findById(newServerId);
      await ctx.editMessageText(
        messages.serverChanged(server?.location || 'Новый сервер'),
        { reply_markup: backToMenuKeyboard() },
      );
    } catch (e) {
      this.logger.error(`Server change error: ${e}`);
      await ctx.editMessageText(messages.serverChangeError, {
        reply_markup: backToMenuKeyboard(),
      });
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

    await ctx.api.sendInvoice(
      from.id,
      `VPN ${plan.name}`,
      `Подписка на ${plan.durationDays} дней`,
      String(payment.id),
      'XTR',
      [{ label: plan.name, amount: plan.priceStars }],
    );
  }

  private async handleYokassaPayment(ctx: any, data: string) {
    const planId = parseInt(data.split(':')[1]);
    const plan = await this.planService.findById(planId);
    if (!plan) return;

    const miniAppUrl = this.config.getOrThrow<string>('MINI_APP_URL');

    await ctx.editMessageText(messages.yokassaPay(plan.name, plan.price), {
      reply_markup: new InlineKeyboard()
        .webApp('💳 Оплатить', `${miniAppUrl}/plans/${planId}/pay`)
        .row()
        .text('« Назад', 'menu'),
    });
  }

  async sendNotification(telegramId: number, text: string): Promise<void> {
    try {
      await this.bot.api.sendMessage(telegramId, text);
    } catch (e) {
      this.logger.warn(`Не удалось отправить уведомление ${telegramId}: ${e}`);
    }
  }
}
