import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { UserService } from '../user/user.service';
import { PlanService } from '../plan/plan.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentService } from '../payment/payment.service';
import { ServerService } from '../server/server.service';
import { PromoService } from '../promo/promo.service';
import { SupportService } from '../support/support.service';
import { messages } from './bot.messages';
import {
  mainMenuKeyboard,
  plansKeyboard,
  paymentMethodKeyboard,
  backToMenuKeyboard,
  serverKeyboard,
  statusKeyboard,
  renewKeyboard,
  deviceSelectionKeyboard,
} from './bot.keyboards';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private bot: Bot;
  private readonly logger = new Logger(BotService.name);
  private supportMode = new Map<number, NodeJS.Timeout>(); // telegramId -> timeout

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly planService: PlanService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly serverService: ServerService,
    private readonly promoService: PromoService,
    @Inject(forwardRef(() => SupportService))
    private readonly supportService: SupportService,
  ) {
    this.bot = new Bot(this.config.getOrThrow<string>('BOT_TOKEN'));
  }

  async onModuleInit() {
    this.registerHandlers();

    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Главное меню' },
      { command: 'status', description: '📊 Статус подписки' },
      { command: 'key', description: '🔑 Ключ подключения' },
      { command: 'server', description: '🌍 Сменить сервер' },
      { command: 'traffic', description: '📈 Трафик' },
      { command: 'renew', description: '🔄 Продлить подписку' },
      { command: 'account', description: '👤 Мой аккаунт' },
      { command: 'referral', description: '🤝 Реферальная ссылка' },
      { command: 'help', description: '❓ Помощь' },
    ]);

    const webhookDomain = this.config.get<string>('WEBHOOK_DOMAIN');
    if (webhookDomain) {
      const webhookSecret = this.config.get<string>('WEBHOOK_SECRET') || '';
      await this.bot.api.setWebhook(`${webhookDomain}/bot/webhook`, {
        secret_token: webhookSecret || undefined,
      });
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

      // Grant 3-day trial for brand new users
      if ((user as any).isNew) {
        try {
          const plans = await this.planService.findAll();
          if (plans.length > 0) {
            const trialPlan = plans[0]; // cheapest/first plan
            const sub = await this.subscriptionService.createSubscription(
              user.id,
              trialPlan.id,
            );
            // Override expiry to 3 days instead of full plan duration
            const trialExpiry = new Date();
            trialExpiry.setDate(trialExpiry.getDate() + 3);
            sub.expiresAt = trialExpiry;
            await this.subscriptionService.updateExpiry(sub.id, trialExpiry);

            this.logger.log(
              `Trial subscription granted to new user #${user.id}`,
            );

            await ctx.reply(
              messages.welcome(from.first_name) +
                '\n\n🎁 Тебе подарок — 3 дня бесплатного VPN!\n' +
                'Скопируй ключ командой /key и подключайся.',
              { reply_markup: mainMenuKeyboard(miniAppUrl) },
            );
            return;
          }
        } catch (e) {
          this.logger.error(`Failed to create trial subscription: ${e}`);
          // Fallback: send welcome without trial
          await ctx.reply(messages.welcome(from.first_name), {
            reply_markup: mainMenuKeyboard(miniAppUrl),
          });
          return;
        }
      }

      // Returning users
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

    // /renew
    this.bot.command('renew', (ctx) => this.handleRenew(ctx));

    // /account
    this.bot.command('account', (ctx) => this.handleAccount(ctx));

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
      } else if (data === 'traffic') {
        await this.handleTraffic(ctx);
      } else if (data === 'renew') {
        await this.handleRenew(ctx);
      } else if (data === 'plans') {
        const plans = await this.planService.findAll();
        await ctx.editMessageText(messages.plans, {
          reply_markup: plansKeyboard(plans),
        });
      } else if (data.startsWith('buy_stars:')) {
        const planId = parseInt(data.split(':')[1]);
        if (isNaN(planId)) return;
        await ctx.editMessageText(messages.selectPayment, {
          reply_markup: paymentMethodKeyboard(planId),
        });
      } else if (data.startsWith('pay_stars:')) {
        await this.handleStarsPayment(ctx, data);
      } else if (data.startsWith('pay_yokassa:')) {
        await this.handleYokassaPayment(ctx, data);
      } else if (data.startsWith('change_server:')) {
        await this.handleChangeServer(ctx, data);
      } else if (data === 'help_ios') {
        await ctx.editMessageText(messages.helpIos, {
          reply_markup: backToMenuKeyboard(),
        });
      } else if (data === 'help_android') {
        await ctx.editMessageText(messages.helpAndroid, {
          reply_markup: backToMenuKeyboard(),
        });
      } else if (data === 'help_windows') {
        await ctx.editMessageText(messages.helpWindows, {
          reply_markup: backToMenuKeyboard(),
        });
      } else if (data === 'help_mac') {
        await ctx.editMessageText(messages.helpMac, {
          reply_markup: backToMenuKeyboard(),
        });
      } else if (data === 'support') {
        await this.handleSupportStart(ctx);
      } else if (data === 'support_cancel') {
        const from = ctx.callbackQuery?.from;
        if (from) this.clearSupportMode(from.id);
        await ctx.editMessageText(messages.menu, {
          reply_markup: mainMenuKeyboard(miniAppUrl),
        });
      }

      await ctx.answerCallbackQuery();
    });

    // Telegram Stars: pre_checkout_query — validate before approving
    this.bot.on('pre_checkout_query', async (ctx) => {
      try {
        const query = ctx.preCheckoutQuery;
        const paymentId = parseInt(query.invoice_payload);
        if (isNaN(paymentId)) {
          await ctx.answerPreCheckoutQuery(false, {
            error_message: 'Неверные данные платежа',
          });
          return;
        }

        const payment = await this.paymentService.findById(paymentId);
        if (!payment || payment.status !== 'pending') {
          await ctx.answerPreCheckoutQuery(false, {
            error_message: 'Платёж не найден или уже обработан',
          });
          return;
        }

        if (query.currency !== 'XTR' || query.total_amount !== payment.amount) {
          await ctx.answerPreCheckoutQuery(false, {
            error_message: 'Сумма или валюта не совпадают',
          });
          return;
        }

        await ctx.answerPreCheckoutQuery(true);
      } catch (e) {
        this.logger.error(`Pre-checkout validation error: ${e}`);
        await ctx.answerPreCheckoutQuery(false, {
          error_message: 'Ошибка проверки платежа',
        });
      }
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

    // Support: handle text messages from users in support mode
    this.bot.on('message:text', async (ctx) => {
      const from = ctx.from;
      if (!from || !this.supportMode.has(from.id)) return;

      const user = await this.userService.findByTelegramId(from.id);
      if (!user) return;

      await this.supportService.addUserMessage(user.id, ctx.message.text);
      this.clearSupportMode(from.id);

      await ctx.reply(
        '✅ Сообщение отправлено в поддержку!\n\n' +
          'Мы ответим в ближайшее время. Ответ придёт сюда, в бот.',
        { reply_markup: backToMenuKeyboard() },
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

    const miniAppUrl = this.config.getOrThrow<string>('MINI_APP_URL');
    await this.sendOrEdit(
      ctx,
      messages.status(
        sub.plan.name,
        expiresDate,
        trafficLimit,
        sub.server.location,
        sub.plan.maxDevices,
      ),
      statusKeyboard(miniAppUrl),
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
    await this.sendOrEdit(ctx, messages.help, deviceSelectionKeyboard());
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

  private async handleRenew(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findByTelegramId(from.id);
    const sub = user
      ? await this.subscriptionService.getActiveSubscription(user.id)
      : null;

    const miniAppUrl = this.config.getOrThrow<string>('MINI_APP_URL');

    if (!sub) {
      const plans = await this.planService.findAll();
      await this.sendOrEdit(ctx, messages.noSubRenew, plansKeyboard(plans));
      return;
    }

    const expiresDate = new Date(sub.expiresAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000),
    );

    await this.sendOrEdit(
      ctx,
      messages.renew(sub.plan.name, expiresDate, daysLeft),
      renewKeyboard(miniAppUrl, sub.planId),
    );
  }

  private async handleAccount(ctx: any) {
    const from = ctx.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.userService.findOrCreate({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
    });

    const code = await this.userService.generateReferralCode(user.id);
    const referralCount = await this.userService.getReferralCount(user.id);
    const allSubs = await this.subscriptionService.getAllSubscriptions(user.id);
    const botUsername = this.bot.botInfo?.username || 'bot';

    await this.sendOrEdit(
      ctx,
      messages.account({
        name: from.first_name || from.username || `User #${user.id}`,
        totalSubs: allSubs.length,
        referralCount,
        bonusDays: user.referralBonusDays,
        referralCode: code,
        botUsername,
      }),
      backToMenuKeyboard(),
      'Markdown',
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
    if (isNaN(newServerId)) return;
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
    if (isNaN(planId)) return;
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
    if (isNaN(planId)) return;
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

  private async handleSupportStart(ctx: any) {
    const from = ctx.callbackQuery?.from || ctx.from;
    if (!from) return;

    // Clear existing timeout if re-entering support mode
    this.clearSupportMode(from.id);

    // Auto-expire support mode after 5 minutes
    const timeout = setTimeout(
      () => {
        this.supportMode.delete(from.id);
      },
      5 * 60 * 1000,
    );
    this.supportMode.set(from.id, timeout);

    const cancelKeyboard = new InlineKeyboard().text(
      '❌ Отмена',
      'support_cancel',
    );

    await ctx.editMessageText(
      '📝 Напиши своё сообщение в поддержку.\n\n' +
        'Опиши проблему или задай вопрос — мы ответим в ближайшее время.',
      { reply_markup: cancelKeyboard },
    );
  }

  private clearSupportMode(telegramId: number) {
    const timeout = this.supportMode.get(telegramId);
    if (timeout) clearTimeout(timeout);
    this.supportMode.delete(telegramId);
  }

  getBotUsername(): string {
    return this.bot.botInfo?.username || 'sellwhyvpn_bot';
  }

  async sendNotification(telegramId: number, text: string): Promise<void> {
    try {
      await this.bot.api.sendMessage(telegramId, text);
    } catch (e) {
      this.logger.warn(`Не удалось отправить уведомление ${telegramId}: ${e}`);
    }
  }

  async postToChannel(
    text: string,
    channelUsername?: string,
  ): Promise<boolean> {
    const channel =
      channelUsername || this.config.get<string>('CHANNEL_USERNAME');
    if (!channel) {
      this.logger.warn('CHANNEL_USERNAME not configured');
      return false;
    }
    try {
      const target = channel.startsWith('@') ? channel : `@${channel}`;
      await this.bot.api.sendMessage(target, text, { parse_mode: 'HTML' });
      this.logger.log(`Posted to channel ${target}`);
      return true;
    } catch (e) {
      this.logger.error(`Failed to post to channel: ${e}`);
      return false;
    }
  }
}
