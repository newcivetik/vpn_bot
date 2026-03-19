import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotService } from '../../bot/bot.service';

@Injectable()
export class AdminNotifyService {
  private readonly logger = new Logger(AdminNotifyService.name);
  private readonly adminTelegramId: number | undefined;

  constructor(
    private readonly config: ConfigService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
  ) {
    this.adminTelegramId = this.config.get<number>('ADMIN_TELEGRAM_ID');
    if (this.adminTelegramId) {
      this.logger.log(`Admin notifications enabled for TG ID: ${this.adminTelegramId}`);
    }
  }

  private async send(text: string): Promise<void> {
    if (!this.adminTelegramId) return;
    try {
      await this.botService.sendNotification(this.adminTelegramId, text);
    } catch (e) {
      this.logger.warn(`Failed to send admin notification: ${e}`);
    }
  }

  async newTicket(ticketId: number, userName: string, message: string): Promise<void> {
    const preview = message.length > 100 ? message.slice(0, 100) + '...' : message;
    await this.send(
      `🆕 Новый тикет #${ticketId}\n\n` +
      `👤 ${userName}\n` +
      `💬 ${preview}`,
    );
  }

  async newTicketMessage(ticketId: number, userName: string, message: string): Promise<void> {
    const preview = message.length > 100 ? message.slice(0, 100) + '...' : message;
    await this.send(
      `💬 Новое сообщение в тикете #${ticketId}\n\n` +
      `👤 ${userName}\n` +
      `${preview}`,
    );
  }

  async newPayment(userName: string, amount: number, method: string, planName: string): Promise<void> {
    const methodLabel = method === 'stars' ? '⭐ Stars' : '💳 YooKassa';
    await this.send(
      `💰 Новая оплата!\n\n` +
      `👤 ${userName}\n` +
      `📦 ${planName}\n` +
      `${methodLabel}: ${amount} ${method === 'stars' ? 'XTR' : '₽'}`,
    );
  }

  async newUser(userName: string, telegramId: number): Promise<void> {
    await this.send(
      `👤 Новый пользователь\n\n` +
      `${userName} (TG: ${telegramId})`,
    );
  }

  async serverDown(location: string, host: string): Promise<void> {
    await this.send(
      `🔴 Сервер не отвечает!\n\n` +
      `🌍 ${location}\n` +
      `🖥 ${host}`,
    );
  }

  async subscriptionExpired(count: number): Promise<void> {
    if (count > 0) {
      await this.send(`📢 Истекло подписок: ${count}`);
    }
  }
}
