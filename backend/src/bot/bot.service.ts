import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { UserService } from '../user/user.service';
import { PlanService } from '../plan/plan.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentService } from '../payment/payment.service';
import { ServerService } from '../server/server.service';
import { PromoService } from '../promo/promo.service';
import { SettingsService } from '../settings/settings.service';
import { messages } from './bot.messages';
import {
  mainMenuKeyboard,
  plansKeyboard,
  paymentMethodKeyboard,
  backToMenuKeyboard,
  serverKeyboard,
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
    private readonly serverService: ServerService,
    private readonly promoService: PromoService,
    private readonly settingsService: SettingsService,
  ) {
    this.bot = new Bot(this.config.getOrThrow<string>('BOT_TOKEN'));
  }

  async onModuleInit() {
    this.registerHandlers();
    this.registerPaymentCallback();

    const webhookDomain = this.config.get<string>('WEBHOOK_DOMAIN');
    if (webhookDomain) {
      await this.bot.api.setWebhook(`${webhookDomain}/bot/webhook`);
      this.logger.log(`Webhook установлен: ${webhookDomain}/bot/webhook`);
    } else {
      this.bot.start();
      this.logger.log('Бот запущен в режиме long polling');
    }
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
          const wasSet = await this.userService.setReferrer(user.id, referrer.id);
          if (wasSet && referrer.telegramId) {
            const name = from.first_name || from.username || 'Кто-то';
            const bonusDays = await this.settingsService.get('referral_bonus_days', '3');
            const referredBonusDays = await this.settingsService.get('referred_bonus_days', '1');
            await this.sendNotification(
              referrer.telegramId,
              messages.referralNewUser(name, bonusDays, referredBonusDays),
            );
          }
          this.logger.log(`User #${user.id} referred by #${referrer.id}`);
        }
      }

      const showTrial = !user.hasUsedTrial;
      await ctx.reply(messages.welcome(from.first_name), {
        reply_markup: mainMenuKeyboard(miniAppUrl, { showTrial }),
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

    // /promo
    this.bot.command('promo', async (ctx) => {
      const code = ctx.match;
      if (!code) {
        await ctx.reply(messages.promoHint);
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
        await ctx.reply(messages.promoInvalid(result.error!));
        return;
      }

      const promo = result.promo!;
      await ctx.reply(messages.promoValid(promo.discountPercent, promo.bonusDays));
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
      const bonusDays = await this.settingsService.get('referral_bonus_days', '3');
      const referredBonusDays = await this.settingsService.get('referred_bonus_days', '1');

      await ctx.reply(
        messages.referralInfo(link, count, bonusDays, referredBonusDays),
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

      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: 'referral',
          title: '🤝 Поделиться VPN',
          description: 'Отправить реферальную ссылку',
          input_message_content: {
            message_text: messages.inlineShareText(link),
          },
        },
      ], { cache_time: 60 });
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
      } else if (data === 'trial') {
        await this.handleTrial(ctx);
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
        messages.paymentSuccess(sub?.connectionLink || 'Ошибка получения ключа'),
        {
          parse_mode: 'Markdown',
          reply_markup: backToMenuKeyboard(),
        },
      );

      // Уведомление рефереру о бонусе
      if (user?.referrerId) {
        const referrer = await this.userService.findById(user.referrerId);
        const bonusDays = await this.settingsService.get('referral_bonus_days', '3');
        const referredBonusDays = await this.settingsService.get('referred_bonus_days', '1');
        if (referrer?.telegramId) {
          const buyerName = ctx.from.first_name || ctx.from.username || 'Друг';
          await this.sendNotification(
            referrer.telegramId,
            messages.referralBonusToReferrer(buyerName, bonusDays),
          );
        }
        await this.sendNotification(
          ctx.from.id,
          messages.referralBonusToReferred(referredBonusDays),
        );
      }
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
  private async sendOrEdit(ctx: any, text: string, keyboard: InlineKeyboard, parseMode?: string) {
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

    const trafficLimit = sub.plan.trafficLimitGB > 0
      ? `${sub.trafficUsedGB} / ${sub.plan.trafficLimitGB} ГБ`
      : `${sub.trafficUsedGB} ГБ (безлимит)`;

    await this.sendOrEdit(
      ctx,
      messages.status(sub.plan.name, expiresDate, trafficLimit, sub.server.location),
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

    await this.sendOrEdit(ctx, messages.key(sub.connectionLink), backToMenuKeyboard(), 'Markdown');
  }

  private async handleHelp(ctx: any) {
    await this.sendOrEdit(ctx, messages.help, backToMenuKeyboard());
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
      await ctx.answerCallbackQuery({ text: messages.alreadyOnServer });
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

  private async handleTrial(ctx: any) {
    const from = ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findOrCreate({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
    });

    if (user.hasUsedTrial) {
      await ctx.editMessageText(messages.trialAlreadyUsed, {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    const plan = await this.planService.findCheapest();
    if (!plan) {
      await ctx.editMessageText(messages.noPlans, {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    try {
      const trialDays = await this.settingsService.getNumber('trial_days', 1);
      const sub = await this.subscriptionService.createSubscription(
        user.id,
        plan.id,
        { trialDays },
      );

      await this.userService.markTrialUsed(user.id);

      await ctx.editMessageText(
        messages.trialSuccess(plan.name, sub.connectionLink),
        { parse_mode: 'Markdown', reply_markup: backToMenuKeyboard() },
      );
    } catch (e) {
      this.logger.error(`Trial activation error: ${e}`);
      await ctx.editMessageText(messages.trialError, {
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
      messages.invoiceTitle(plan.name),
      messages.invoiceDescription(plan.durationDays),
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

  /** Register callback for YoKassa payments (referral notifications) */
  private registerPaymentCallback() {
    this.paymentService.setOnPaymentConfirmed(async (userId: number) => {
      try {
        const user = await this.userService.findById(userId);
        if (!user?.referrerId) return;

        const referrer = await this.userService.findById(user.referrerId);
        const bonusDays = await this.settingsService.get('referral_bonus_days', '3');
        const referredBonusDays = await this.settingsService.get('referred_bonus_days', '1');
        if (referrer?.telegramId) {
          const buyerName = user.firstName || user.username || 'Друг';
          await this.sendNotification(
            referrer.telegramId,
            messages.referralBonusToReferrer(buyerName, bonusDays),
          );
        }
        if (user.telegramId) {
          await this.sendNotification(
            user.telegramId,
            messages.referralBonusToReferred(referredBonusDays),
          );
        }
      } catch (e) {
        this.logger.error(`Referral notification error: ${e}`);
      }
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
