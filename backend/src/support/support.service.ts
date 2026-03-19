import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupportTicket,
  SupportMessage,
  TicketStatus,
} from './support-ticket.entity';
import { BotService } from '../bot/bot.service';
import { AdminNotifyService } from '../shared/admin-notify/admin-notify.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(SupportMessage)
    private readonly messageRepo: Repository<SupportMessage>,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly adminNotify: AdminNotifyService,
  ) {}

  async createTicket(
    userId: number,
    text: string,
    subject?: string,
  ): Promise<SupportTicket> {
    const ticket = this.ticketRepo.create({
      userId,
      subject: subject || 'Обращение в поддержку',
      status: TicketStatus.OPEN,
    });
    await this.ticketRepo.save(ticket);

    const message = this.messageRepo.create({
      ticketId: ticket.id,
      text,
      fromAdmin: false,
    });
    await this.messageRepo.save(message);

    this.logger.log(`Ticket #${ticket.id} created by user #${userId}`);

    // Notify admin about new ticket
    const ticketWithUser = await this.ticketRepo.findOne({
      where: { id: ticket.id },
      relations: ['user'],
    });
    const userName =
      ticketWithUser?.user?.firstName ||
      ticketWithUser?.user?.username ||
      `User #${userId}`;
    this.adminNotify.newTicket(ticket.id, userName, text).catch(() => {});

    return ticket;
  }

  async addUserMessage(
    userId: number,
    text: string,
  ): Promise<{ ticket: SupportTicket; message: SupportMessage }> {
    // Find open ticket or create new one
    let ticket = await this.ticketRepo.findOne({
      where: { userId, status: TicketStatus.OPEN },
      order: { createdAt: 'DESC' },
    });

    if (!ticket) {
      ticket = await this.ticketRepo.findOne({
        where: { userId, status: TicketStatus.IN_PROGRESS },
        order: { createdAt: 'DESC' },
      });
    }

    if (!ticket) {
      ticket = await this.createTicket(userId, text);
      const msg = await this.messageRepo.findOne({
        where: { ticketId: ticket.id },
      });
      return { ticket, message: msg! };
    }

    const message = this.messageRepo.create({
      ticketId: ticket.id,
      text,
      fromAdmin: false,
    });
    await this.messageRepo.save(message);

    ticket.updatedAt = new Date();
    await this.ticketRepo.save(ticket);

    // Notify admin about new message
    const ticketWithUser = await this.ticketRepo.findOne({
      where: { id: ticket.id },
      relations: ['user'],
    });
    const userName =
      ticketWithUser?.user?.firstName ||
      ticketWithUser?.user?.username ||
      `User #${userId}`;
    this.adminNotify
      .newTicketMessage(ticket.id, userName, text)
      .catch(() => {});

    return { ticket, message };
  }

  async replyFromAdmin(
    ticketId: number,
    text: string,
  ): Promise<SupportMessage> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });
    if (!ticket) throw new NotFoundException('Тикет не найден');

    const message = this.messageRepo.create({
      ticketId,
      text,
      fromAdmin: true,
    });
    await this.messageRepo.save(message);

    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }
    ticket.updatedAt = new Date();
    await this.ticketRepo.save(ticket);

    // Send reply to user via bot
    try {
      await this.botService.sendNotification(
        ticket.user.telegramId,
        `💬 Ответ поддержки:\n\n${text}`,
      );
    } catch (e) {
      this.logger.warn(`Failed to send reply to user: ${e}`);
    }

    return message;
  }

  async getTickets(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ data: SupportTicket[]; total: number }> {
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await this.ticketRepo.findAndCount({
      where,
      relations: ['user', 'messages'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getTicketById(id: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['user', 'messages'],
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!ticket) throw new NotFoundException('Тикет не найден');
    return ticket;
  }

  async closeTicket(id: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!ticket) throw new NotFoundException('Тикет не найден');

    ticket.status = TicketStatus.CLOSED;
    await this.ticketRepo.save(ticket);

    try {
      await this.botService.sendNotification(
        ticket.user.telegramId,
        '✅ Ваше обращение закрыто.\n\nЕсли остались вопросы — напишите снова!',
      );
    } catch (e) {
      this.logger.warn(`Failed to notify ticket close: ${e}`);
    }

    return ticket;
  }

  async getOpenTicketCount(): Promise<number> {
    return this.ticketRepo.count({
      where: [
        { status: TicketStatus.OPEN },
        { status: TicketStatus.IN_PROGRESS },
      ],
    });
  }

  async getUserTicketWithMessages(
    userId: number,
  ): Promise<SupportTicket | null> {
    return this.ticketRepo.findOne({
      where: [
        { userId, status: TicketStatus.OPEN },
        { userId, status: TicketStatus.IN_PROGRESS },
      ],
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOpenTicketForUser(userId: number): Promise<SupportTicket | null> {
    return this.ticketRepo.findOne({
      where: [
        { userId, status: TicketStatus.OPEN },
        { userId, status: TicketStatus.IN_PROGRESS },
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
