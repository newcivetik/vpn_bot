import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InlineKeyboard } from 'grammy';
import { BotService } from './bot.service';
import { AdminService } from '../admin/admin.service';
import { SupportService } from '../support/support.service';
import { UserService } from '../user/user.service';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class AdminBotService implements OnModuleInit {
  private readonly logger = new Logger(AdminBotService.name);
  private readonly adminTelegramId: number | undefined;
  private replyMode = new Map<number, number>(); // adminTgId -> ticketId
  private broadcastMode = new Map<number, { onlyActive: boolean }>(); // adminTgId -> options
  private grantMode = new Map<number, { userId: number }>(); // adminTgId -> userId waiting for plan selection
  private searchMode = new Set<number>(); // adminTgId waiting for search query

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
    @Inject(forwardRef(() => SupportService))
    private readonly supportService: SupportService,
    private readonly userService: UserService,
    private readonly planService: PlanService,
  ) {
    this.adminTelegramId = this.config.get<number>('ADMIN_TELEGRAM_ID');
  }

  private isAdmin(fromId: number): boolean {
    return !!this.adminTelegramId && fromId === Number(this.adminTelegramId);
  }

  async onModuleInit() {
    if (!this.adminTelegramId) {
      this.logger.log('ADMIN_TELEGRAM_ID not set, admin bot disabled');
      return;
    }

    const bot = this.botService.getBot();

    // /admin — main menu
    bot.command('admin', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await ctx.reply('🔧 Админ-панель', {
        reply_markup: this.adminMenuKeyboard(),
      });
    });

    // /admin_stats
    bot.command('admin_stats', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await this.handleStats(ctx);
    });

    // /admin_tickets
    bot.command('admin_tickets', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await this.handleTickets(ctx);
    });

    // /admin_servers
    bot.command('admin_servers', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await this.handleServers(ctx);
    });

    // /admin_payments
    bot.command('admin_payments', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await this.handlePayments(ctx);
    });

    // /admin_user <search> — find user
    bot.command('admin_user', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      const query = ctx.match;
      if (!query) {
        const fromId = ctx.from.id;
        this.searchMode.add(fromId);
        setTimeout(() => this.searchMode.delete(fromId), 2 * 60 * 1000);
        await ctx.reply('🔍 Введи Telegram ID, username или имя для поиска:');
        return;
      }
      await this.handleUserSearch(ctx, query);
    });

    // /admin_broadcast — send message to all users
    bot.command('admin_broadcast', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await ctx.reply('📢 Рассылка\n\nКому отправить?', {
        reply_markup: new InlineKeyboard()
          .text('Всем пользователям', 'admin_bc:all')
          .row()
          .text('Только активным', 'admin_bc:active')
          .row()
          .text('← Админ-меню', 'admin_menu'),
      });
    });

    // /admin_stars — star balance
    bot.command('admin_stars', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await this.handleStarsBalance(ctx);
    });

    // Callback queries
    bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

      // Admin menu
      if (data === 'admin_menu') {
        await ctx.editMessageText('🔧 Админ-панель', {
          reply_markup: this.adminMenuKeyboard(),
        });
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_stats') {
        await this.handleStats(ctx);
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_tickets') {
        await this.handleTickets(ctx);
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_servers') {
        await this.handleServers(ctx);
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_payments') {
        await this.handlePayments(ctx);
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_stars') {
        await this.handleStarsBalance(ctx);
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_search') {
        this.searchMode.add(ctx.from.id);
        setTimeout(() => this.searchMode.delete(ctx.from.id), 2 * 60 * 1000);
        await ctx.reply('🔍 Введи Telegram ID, username или имя:');
        await ctx.answerCallbackQuery();

        // Ticket actions
      } else if (data.startsWith('admin_ticket:')) {
        const ticketId = parseInt(data.split(':')[1]);
        if (isNaN(ticketId)) return;
        try {
          const ticket = await this.supportService.getTicketById(ticketId);
          const userName =
            ticket.user?.firstName ||
            ticket.user?.username ||
            `User #${ticket.userId}`;
          let text = `📩 Тикет #${ticket.id} · ${userName}\n`;
          text += `Статус: ${ticket.status}\n\n`;

          for (const msg of ticket.messages.slice(-5)) {
            const sender = msg.fromAdmin ? '👨‍💼 Админ' : `👤 ${userName}`;
            const time = new Date(msg.createdAt).toLocaleString('ru-RU');
            text += `${sender} (${time}):\n${msg.text}\n\n`;
          }

          const kb = new InlineKeyboard()
            .text('✍️ Ответить', `admin_reply:${ticketId}`)
            .text('🔒 Закрыть', `admin_close:${ticketId}`)
            .row()
            .text('← Админ-меню', 'admin_menu');

          await ctx.editMessageText(text, { reply_markup: kb });
        } catch (e) {
          await ctx.answerCallbackQuery({ text: `Ошибка: ${e}` });
        }
        await ctx.answerCallbackQuery();
      } else if (data.startsWith('admin_reply:')) {
        const ticketId = parseInt(data.split(':')[1]);
        if (isNaN(ticketId)) return;
        this.replyMode.set(ctx.from.id, ticketId);
        setTimeout(() => this.replyMode.delete(ctx.from.id), 2 * 60 * 1000);
        await ctx.answerCallbackQuery();
        await ctx.reply(
          `✍️ Напишите ответ на тикет #${ticketId}.\n\nСледующее сообщение будет отправлено пользователю.`,
        );
      } else if (data.startsWith('admin_close:')) {
        const ticketId = parseInt(data.split(':')[1]);
        if (isNaN(ticketId)) return;
        try {
          await this.supportService.closeTicket(ticketId);
          await ctx.editMessageText(`✅ Тикет #${ticketId} закрыт`, {
            reply_markup: new InlineKeyboard().text(
              '← Админ-меню',
              'admin_menu',
            ),
          });
        } catch (e) {
          await ctx.answerCallbackQuery({ text: `Ошибка: ${e}` });
        }
        await ctx.answerCallbackQuery();

        // User actions
      } else if (data.startsWith('admin_view_user:')) {
        const userId = parseInt(data.split(':')[1]);
        if (isNaN(userId)) return;
        await this.showUserDetails(ctx, userId);
        await ctx.answerCallbackQuery();
      } else if (data.startsWith('admin_grant:')) {
        const userId = parseInt(data.split(':')[1]);
        if (isNaN(userId)) return;
        await this.showPlanSelection(ctx, userId);
        await ctx.answerCallbackQuery();
      } else if (data.startsWith('admin_do_grant:')) {
        const [, userIdStr, planIdStr] = data.split(':').slice(1);
        const userId = parseInt(userIdStr);
        const planId = parseInt(planIdStr);
        if (isNaN(userId) || isNaN(planId)) return;
        try {
          const sub = await this.adminService.grantSubscription(userId, planId);
          await ctx.editMessageText(
            `✅ Подписка #${sub.id} выдана!\n\nПользователь уведомлён.`,
            {
              reply_markup: new InlineKeyboard()
                .text('👤 К пользователю', `admin_view_user:${userId}`)
                .row()
                .text('← Админ-меню', 'admin_menu'),
            },
          );
        } catch (e) {
          await ctx.editMessageText(`❌ Ошибка выдачи: ${e}`, {
            reply_markup: new InlineKeyboard().text(
              '← Админ-меню',
              'admin_menu',
            ),
          });
        }
        await ctx.answerCallbackQuery();

        // Broadcast
      } else if (data === 'admin_bc_start') {
        await ctx.editMessageText('📢 Рассылка\n\nКому отправить?', {
          reply_markup: new InlineKeyboard()
            .text('Всем пользователям', 'admin_bc:all')
            .row()
            .text('Только активным', 'admin_bc:active')
            .row()
            .text('← Админ-меню', 'admin_menu'),
        });
        await ctx.answerCallbackQuery();
      } else if (data === 'admin_bc:all' || data === 'admin_bc:active') {
        const onlyActive = data === 'admin_bc:active';
        this.broadcastMode.set(ctx.from.id, { onlyActive });
        setTimeout(() => this.broadcastMode.delete(ctx.from.id), 5 * 60 * 1000);
        await ctx.answerCallbackQuery();
        await ctx.reply(
          `📢 Введи текст рассылки (${onlyActive ? 'только активным' : 'всем'}):\n\n` +
            `Следующее сообщение будет отправлено пользователям.`,
        );
      }
    });

    // Handle text messages from admin (reply/search/broadcast modes)
    bot.on('message:text', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

      // Ticket reply mode
      const ticketId = this.replyMode.get(ctx.from.id);
      if (ticketId) {
        this.replyMode.delete(ctx.from.id);
        try {
          await this.supportService.replyFromAdmin(ticketId, ctx.message.text);
          await ctx.reply(`✅ Ответ отправлен в тикет #${ticketId}`, {
            reply_markup: new InlineKeyboard()
              .text('📩 Тикет', `admin_ticket:${ticketId}`)
              .text('← Админ-меню', 'admin_menu'),
          });
        } catch (e) {
          await ctx.reply(`❌ Ошибка: ${e}`);
        }
        return;
      }

      // Broadcast mode
      const bcOpts = this.broadcastMode.get(ctx.from.id);
      if (bcOpts) {
        this.broadcastMode.delete(ctx.from.id);
        try {
          await ctx.reply('📢 Рассылка запущена...');
          const result = await this.adminService.broadcastMessage(
            ctx.message.text,
            bcOpts.onlyActive,
          );
          await ctx.reply(
            `✅ Рассылка завершена\n\n` +
              `Отправлено: ${result.sent}\n` +
              `Ошибок: ${result.failed}`,
            {
              reply_markup: new InlineKeyboard().text(
                '← Админ-меню',
                'admin_menu',
              ),
            },
          );
        } catch (e) {
          await ctx.reply(`❌ Ошибка рассылки: ${e}`);
        }
        return;
      }

      // Search mode
      if (this.searchMode.has(ctx.from.id)) {
        this.searchMode.delete(ctx.from.id);
        await this.handleUserSearch(ctx, ctx.message.text);
        return;
      }
    });

    this.logger.log('Admin bot commands registered');
  }

  private adminMenuKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('📊 Статистика', 'admin_stats')
      .text('💰 Платежи', 'admin_payments')
      .row()
      .text('📨 Тикеты', 'admin_tickets')
      .text('🖥 Серверы', 'admin_servers')
      .row()
      .text('🔍 Найти юзера', 'admin_search')
      .text('⭐ Баланс Stars', 'admin_stars')
      .row()
      .text('📢 Рассылка', 'admin_bc_start');
  }

  private async handleStats(ctx: any) {
    try {
      const stats = await this.adminService.getDashboardStats();
      const text =
        `📊 Статистика\n\n` +
        `👥 Пользователей: ${stats.totalUsers}\n` +
        `✅ Активных подписок: ${stats.totalActiveSubscriptions}\n` +
        `💰 Выручка: ${stats.totalRevenueRubles} ₽ / ${stats.totalRevenueStars} ⭐\n` +
        `📈 Новых сегодня: ${stats.newUsersToday}\n` +
        `📈 За неделю: ${stats.newUsersWeek}\n` +
        `📈 За месяц: ${stats.newUsersMonth}\n` +
        `🔄 Конверсия: ${stats.conversionRate}%\n` +
        `⏰ Истекают через 3 дня: ${stats.expiringIn3Days}\n` +
        `📉 Отток за неделю: ${stats.churnedWeek}\n` +
        `🖥 Серверов: ${stats.activeServers}`;

      const kb = new InlineKeyboard().text('← Админ-меню', 'admin_menu');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: kb });
      } else {
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }

  private async handleTickets(ctx: any) {
    try {
      const { data: tickets } = await this.supportService.getTickets(
        1,
        10,
        undefined,
      );
      const open = tickets.filter(
        (t) => t.status === 'open' || t.status === 'in_progress',
      );

      if (open.length === 0) {
        const text = '✅ Нет открытых тикетов';
        const kb = new InlineKeyboard().text('← Админ-меню', 'admin_menu');
        if (ctx.callbackQuery) {
          await ctx.editMessageText(text, { reply_markup: kb });
        } else {
          await ctx.reply(text, { reply_markup: kb });
        }
        return;
      }

      let text = `📨 Открытых тикетов: ${open.length}\n\n`;
      const kb = new InlineKeyboard();

      for (const ticket of open.slice(0, 5)) {
        const userName =
          ticket.user?.firstName ||
          ticket.user?.username ||
          `User #${ticket.userId}`;
        const lastMsg = ticket.messages?.[ticket.messages.length - 1];
        const preview = lastMsg
          ? lastMsg.text.slice(0, 50) + (lastMsg.text.length > 50 ? '...' : '')
          : '';
        text += `#${ticket.id} · ${userName}\n${preview}\n\n`;
        kb.text(`📩 #${ticket.id}`, `admin_ticket:${ticket.id}`).row();
      }
      kb.text('← Админ-меню', 'admin_menu');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: kb });
      } else {
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }

  private async handleServers(ctx: any) {
    try {
      const servers = await this.adminService.getAllServers();
      let text = '🖥 Серверы:\n\n';
      for (const s of servers) {
        const status = s.isActive ? '🟢' : '🔴';
        text += `${status} ${s.name} (${s.location})\n`;
        text += `   ${s.currentClients}/${s.maxClients} клиентов\n\n`;
      }

      const kb = new InlineKeyboard().text('← Админ-меню', 'admin_menu');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: kb });
      } else {
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }

  private async handlePayments(ctx: any) {
    try {
      const { data: payments } = await this.adminService.getPayments(1, 10);
      if (payments.length === 0) {
        const kb = new InlineKeyboard().text('← Админ-меню', 'admin_menu');
        if (ctx.callbackQuery) {
          await ctx.editMessageText('Нет платежей', { reply_markup: kb });
        } else {
          await ctx.reply('Нет платежей', { reply_markup: kb });
        }
        return;
      }
      let text = '💰 Последние платежи:\n\n';
      for (const p of payments) {
        const method = p.method === 'stars' ? '⭐' : '💳';
        const status =
          p.status === 'paid' ? '✅' : p.status === 'pending' ? '⏳' : '❌';
        const userName =
          p.user?.firstName || p.user?.username || `User #${p.userId}`;
        text += `${status} ${method} ${p.amount} ${p.method === 'stars' ? 'XTR' : '₽'} · ${userName}\n`;
        text += `   ${new Date(p.createdAt).toLocaleString('ru-RU')}\n\n`;
      }

      const kb = new InlineKeyboard().text('← Админ-меню', 'admin_menu');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: kb });
      } else {
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }

  private async handleStarsBalance(ctx: any) {
    try {
      const botToken = this.config.getOrThrow<string>('BOT_TOKEN');
      const res = await fetch(
        `https://api.telegram.org/bot${botToken}/getStarTransactions`,
      );
      const json = (await res.json()) as any;

      if (!json.ok) {
        await ctx.reply('❌ Не удалось получить баланс Stars');
        return;
      }

      const transactions = json.result?.transactions || [];
      let totalEarned = 0;
      let text = '⭐ Telegram Stars\n\n';

      for (const tx of transactions) {
        totalEarned += tx.amount;
      }

      text += `Баланс: ${totalEarned} ⭐\n`;
      text += `Транзакций: ${transactions.length}\n\n`;

      // Show last 5 transactions
      for (const tx of transactions.slice(0, 5)) {
        const user = tx.source?.user;
        const userName = user
          ? user.first_name || user.username || `ID ${user.id}`
          : 'Неизвестно';
        const date = new Date(tx.date * 1000).toLocaleString('ru-RU');
        text += `+${tx.amount} ⭐ · ${userName} · ${date}\n`;
      }

      const kb = new InlineKeyboard().text('← Админ-меню', 'admin_menu');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: kb });
      } else {
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }

  private async handleUserSearch(ctx: any, query: string) {
    try {
      const { data: users, total } = await this.adminService.getUsers(
        1,
        5,
        query.trim(),
      );
      if (users.length === 0) {
        await ctx.reply('❌ Пользователь не найден', {
          reply_markup: new InlineKeyboard().text('← Админ-меню', 'admin_menu'),
        });
        return;
      }

      let text = `🔍 Найдено: ${total}\n\n`;
      const kb = new InlineKeyboard();

      for (const u of users) {
        text += `#${u.id} · ${u.firstName || ''} @${u.username || ''} · TG: ${u.telegramId}\n`;
        kb.text(
          `👤 ${u.firstName || u.username || `#${u.id}`}`,
          `admin_view_user:${u.id}`,
        ).row();
      }
      kb.text('← Админ-меню', 'admin_menu');

      await ctx.reply(text, { reply_markup: kb });
    } catch (e) {
      await ctx.reply(`❌ Ошибка поиска: ${e}`);
    }
  }

  private async showUserDetails(ctx: any, userId: number) {
    try {
      const user = await this.adminService.getUserById(userId);
      if (!user) {
        await ctx.answerCallbackQuery({ text: 'Пользователь не найден' });
        return;
      }

      let text =
        `👤 ${user.firstName || ''} @${user.username || ''}\n` +
        `TG: ${user.telegramId}\n` +
        `ID: ${user.id}\n` +
        `Бонус дней: ${user.referralBonusDays}\n` +
        `Рефералов: ${user.referralCount}\n` +
        `Создан: ${new Date(user.createdAt).toLocaleDateString('ru-RU')}\n\n`;

      // Active subscription
      const activeSub = user.subscriptions?.find(
        (s: any) => s.status === 'active',
      );
      if (activeSub) {
        text +=
          `✅ Подписка: ${activeSub.plan?.name}\n` +
          `   До: ${new Date(activeSub.expiresAt).toLocaleDateString('ru-RU')}\n` +
          `   Сервер: ${activeSub.server?.location || '?'}\n\n`;
      } else {
        text += '❌ Нет активной подписки\n\n';
      }

      // Recent payments
      const recentPayments = user.payments?.slice(0, 3) || [];
      if (recentPayments.length > 0) {
        text += '💰 Платежи:\n';
        for (const p of recentPayments) {
          const method = p.method === 'stars' ? '⭐' : '💳';
          const status = p.status === 'paid' ? '✅' : '⏳';
          text += `   ${status} ${method} ${p.amount}\n`;
        }
      }

      const kb = new InlineKeyboard()
        .text('🎁 Выдать подписку', `admin_grant:${userId}`)
        .row()
        .text('← Админ-меню', 'admin_menu');

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: kb });
      } else {
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }

  private async showPlanSelection(ctx: any, userId: number) {
    try {
      const plans = await this.planService.findAll();
      if (plans.length === 0) {
        await ctx.answerCallbackQuery({ text: 'Нет доступных тарифов' });
        return;
      }

      let text = '🎁 Выбери тариф для выдачи:\n\n';
      const kb = new InlineKeyboard();

      for (const plan of plans) {
        const traffic =
          plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ` : '∞';
        text += `${plan.name} — ${plan.durationDays} дн. · ${traffic}\n`;
        kb.text(plan.name, `admin_do_grant:${userId}:${plan.id}`).row();
      }
      kb.text('← Назад', `admin_view_user:${userId}`);

      await ctx.editMessageText(text, { reply_markup: kb });
    } catch (e) {
      await ctx.reply(`❌ Ошибка: ${e}`);
    }
  }
}
