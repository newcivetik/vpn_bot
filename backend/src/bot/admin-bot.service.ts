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

@Injectable()
export class AdminBotService implements OnModuleInit {
  private readonly logger = new Logger(AdminBotService.name);
  private readonly adminTelegramId: number | undefined;
  private replyMode = new Map<number, number>(); // adminTgId -> ticketId

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
    @Inject(forwardRef(() => SupportService))
    private readonly supportService: SupportService,
  ) {
    this.adminTelegramId = this.config.get<number>('ADMIN_TELEGRAM_ID');
  }

  private isAdmin(fromId: number): boolean {
    return !!this.adminTelegramId && fromId === this.adminTelegramId;
  }

  async onModuleInit() {
    if (!this.adminTelegramId) {
      this.logger.log('ADMIN_TELEGRAM_ID not set, admin bot disabled');
      return;
    }

    const bot = this.botService.getBot();

    // Admin commands
    bot.command('admin', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      await ctx.reply(
        '🔧 Админ-панель\n\n' +
          'Команды:\n' +
          '/admin_stats — Статистика\n' +
          '/admin_tickets — Открытые тикеты\n' +
          '/admin_servers — Статус серверов\n' +
          '/admin_payments — Последние платежи',
      );
    });

    bot.command('admin_stats', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      try {
        const stats = await this.adminService.getDashboardStats();
        await ctx.reply(
          `📊 Статистика\n\n` +
            `👥 Пользователей: ${stats.totalUsers}\n` +
            `✅ Активных подписок: ${stats.totalActiveSubscriptions}\n` +
            `💰 Выручка: ${stats.totalRevenueRubles} ₽ / ${stats.totalRevenueStars} ⭐\n` +
            `📈 Новых сегодня: ${stats.newUsersToday}\n` +
            `📈 За неделю: ${stats.newUsersWeek}\n` +
            `📈 За месяц: ${stats.newUsersMonth}\n` +
            `🔄 Конверсия: ${stats.conversionRate}%\n` +
            `⏰ Истекают через 3 дня: ${stats.expiringIn3Days}\n` +
            `🖥 Серверов: ${stats.activeServers}`,
        );
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e}`);
      }
    });

    bot.command('admin_tickets', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      try {
        const { data: tickets, total } = await this.supportService.getTickets(
          1,
          10,
          undefined,
        );
        const open = tickets.filter(
          (t) => t.status === 'open' || t.status === 'in_progress',
        );

        if (open.length === 0) {
          await ctx.reply('✅ Нет открытых тикетов');
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

        await ctx.reply(text, { reply_markup: kb });
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e}`);
      }
    });

    bot.command('admin_servers', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      try {
        const servers = await this.adminService.getAllServers();
        let text = '🖥 Серверы:\n\n';
        for (const s of servers) {
          const status = s.isActive ? '🟢' : '🔴';
          text += `${status} ${s.name} (${s.location})\n`;
          text += `   ${s.currentClients}/${s.maxClients} клиентов\n\n`;
        }
        await ctx.reply(text);
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e}`);
      }
    });

    bot.command('admin_payments', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;
      try {
        const { data: payments } = await this.adminService.getPayments(
          1,
          5,
        );
        if (payments.length === 0) {
          await ctx.reply('Нет платежей');
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
        await ctx.reply(text);
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e}`);
      }
    });

    // Callback handler for admin ticket view & reply
    bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

      if (data.startsWith('admin_ticket:')) {
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
            .text('🔒 Закрыть', `admin_close:${ticketId}`);

          await ctx.editMessageText(text, { reply_markup: kb });
        } catch (e) {
          await ctx.answerCallbackQuery({ text: `Ошибка: ${e}` });
        }
        await ctx.answerCallbackQuery();
      } else if (data.startsWith('admin_reply:')) {
        const ticketId = parseInt(data.split(':')[1]);
        if (isNaN(ticketId)) return;
        this.replyMode.set(ctx.from.id, ticketId);

        // Auto-clear after 2 minutes
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
          await ctx.editMessageText(`✅ Тикет #${ticketId} закрыт`);
        } catch (e) {
          await ctx.answerCallbackQuery({ text: `Ошибка: ${e}` });
        }
        await ctx.answerCallbackQuery();
      }
    });

    // Handle reply mode: admin text messages
    // This runs before the support mode handler in BotService because
    // we register it first and check admin ID
    bot.on('message:text', async (ctx) => {
      if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

      const ticketId = this.replyMode.get(ctx.from.id);
      if (!ticketId) return;

      this.replyMode.delete(ctx.from.id);

      try {
        await this.supportService.replyFromAdmin(ticketId, ctx.message.text);
        await ctx.reply(`✅ Ответ отправлен в тикет #${ticketId}`);
      } catch (e) {
        await ctx.reply(`❌ Ошибка: ${e}`);
      }
    });

    this.logger.log('Admin bot commands registered');
  }
}
