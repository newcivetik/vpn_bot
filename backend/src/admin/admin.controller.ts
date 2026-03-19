import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminService } from './admin.service';
import {
  LoginDto,
  PaginationQuery,
  CreatePlanDto,
  UpdatePlanDto,
  CreateServerDto,
  UpdateServerDto,
  CreatePromoDto,
  UpdatePromoDto,
  CreateSubscriptionDto,
  ExtendSubscriptionDto,
  CancelSubscriptionDto,
  BroadcastDto,
  SubscriptionFilterQuery,
  PaymentFilterQuery,
  CreatePersonalDiscountDto,
  PersonalDiscountFilterQuery,
  ReplyTicketDto,
  TicketFilterQuery,
} from './admin.dto';
import { SupportService } from '../support/support.service';

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly supportService: SupportService,
  ) {}

  // ─── Auth (no guard) ──────────────────────────────────

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Body() dto: LoginDto) {
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');
    if (!adminPassword) {
      throw new UnauthorizedException('Admin login is disabled');
    }
    const a = Buffer.from(dto.password);
    const b = Buffer.from(adminPassword);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check if 2FA is enabled
    const settings = await this.adminService.getAdminSettings();
    if (settings.totpEnabled && settings.totpSecret) {
      if (!dto.totpCode) {
        return { requiresTwoFactor: true };
      }
      const valid = await this.adminService.verifyTotp(
        settings.totpSecret,
        dto.totpCode,
      );
      if (!valid) {
        throw new UnauthorizedException('Неверный код 2FA');
      }
    }

    const token = await this.jwtService.signAsync({ role: 'admin' });
    this.adminService.logAction('login', {}, dto['ip'] || 'unknown');
    return { token };
  }

  // ─── 2FA ─────────────────────────────────────────────

  @Get('2fa/status')
  @UseGuards(AdminAuthGuard)
  async get2faStatus() {
    const settings = await this.adminService.getAdminSettings();
    return { enabled: settings.totpEnabled };
  }

  @Post('2fa/setup')
  @UseGuards(AdminAuthGuard)
  async setup2fa() {
    const { secret, uri } = await this.adminService.setupTotp();
    const QRCode = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(uri);
    return { secret, uri, qrDataUrl };
  }

  @Post('2fa/enable')
  @UseGuards(AdminAuthGuard)
  async enable2fa(@Body() body: { code: string }) {
    const success = await this.adminService.enableTotp(body.code);
    if (!success) throw new UnauthorizedException('Неверный код');
    this.adminService.logAction('enable_2fa', {});
    return { enabled: true };
  }

  @Post('2fa/disable')
  @UseGuards(AdminAuthGuard)
  async disable2fa(@Body() body: { code: string }) {
    const success = await this.adminService.disableTotp(body.code);
    if (!success) throw new UnauthorizedException('Неверный код');
    this.adminService.logAction('disable_2fa', {});
    return { enabled: false };
  }

  // ─── Dashboard ────────────────────────────────────────

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/revenue-chart')
  @UseGuards(AdminAuthGuard)
  getRevenueChart(@Query('days') days?: string) {
    return this.adminService.getRevenueChart(Number(days) || 30);
  }

  @Get('dashboard/user-growth')
  @UseGuards(AdminAuthGuard)
  getUserGrowth(@Query('days') days?: string) {
    return this.adminService.getUserGrowthChart(Number(days) || 30);
  }

  @Get('dashboard/subscription-chart')
  @UseGuards(AdminAuthGuard)
  getSubscriptionChart(@Query('days') days?: string) {
    return this.adminService.getSubscriptionChart(Number(days) || 30);
  }

  @Get('dashboard/funnel')
  @UseGuards(AdminAuthGuard)
  getFunnel(@Query('days') days?: string) {
    return this.adminService.getFunnelAnalytics(Number(days) || 30);
  }

  // ─── Admin Logs ──────────────────────────────────────

  @Get('logs')
  @UseGuards(AdminAuthGuard)
  getLogs(@Query() query: PaginationQuery) {
    return this.adminService.getActionLogs(query.page || 1, query.limit || 50);
  }

  // ─── Users ────────────────────────────────────────────

  @Get('users')
  @UseGuards(AdminAuthGuard)
  getUsers(@Query() query: PaginationQuery) {
    return this.adminService.getUsers(
      query.page || 1,
      query.limit || 20,
      query.search,
    );
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserById(id);
  }

  // ─── Subscriptions ───────────────────────────────────

  @Get('subscriptions')
  @UseGuards(AdminAuthGuard)
  getSubscriptions(@Query() query: SubscriptionFilterQuery) {
    return this.adminService.getSubscriptions(
      query.page || 1,
      query.limit || 20,
      query.status,
      query.userId,
    );
  }

  @Post('subscriptions/grant')
  @UseGuards(AdminAuthGuard)
  async grantSubscription(@Body() dto: CreateSubscriptionDto) {
    const result = await this.adminService.grantSubscription(
      dto.userId,
      dto.planId,
      dto.notify !== false,
    );
    this.adminService.logAction('grant_subscription', {
      userId: dto.userId,
      planId: dto.planId,
    });
    return result;
  }

  @Post('subscriptions/:id/extend')
  @UseGuards(AdminAuthGuard)
  async extendSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendSubscriptionDto,
  ) {
    const result = await this.adminService.extendSubscription(
      id,
      dto.days,
      dto.notify !== false,
    );
    this.adminService.logAction('extend_subscription', {
      subscriptionId: id,
      days: dto.days,
    });
    return result;
  }

  @Post('subscriptions/:id/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const result = await this.adminService.cancelSubscription(
      id,
      dto.notify !== false,
    );
    this.adminService.logAction('cancel_subscription', { subscriptionId: id });
    return result;
  }

  // ─── Plans ────────────────────────────────────────────

  @Get('plans')
  @UseGuards(AdminAuthGuard)
  getPlans() {
    return this.adminService.getAllPlans();
  }

  @Post('plans')
  @UseGuards(AdminAuthGuard)
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @UseGuards(AdminAuthGuard)
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @UseGuards(AdminAuthGuard)
  deletePlan(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deletePlan(id);
  }

  // ─── Servers ──────────────────────────────────────────

  @Get('servers')
  @UseGuards(AdminAuthGuard)
  getServers() {
    return this.adminService.getAllServers();
  }

  @Post('servers')
  @UseGuards(AdminAuthGuard)
  createServer(@Body() dto: CreateServerDto) {
    return this.adminService.createServer(dto);
  }

  @Patch('servers/:id')
  @UseGuards(AdminAuthGuard)
  updateServer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServerDto,
  ) {
    return this.adminService.updateServer(id, dto);
  }

  @Delete('servers/:id')
  @UseGuards(AdminAuthGuard)
  deleteServer(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteServer(id);
  }

  @Get('servers/:id/health')
  @UseGuards(AdminAuthGuard)
  getServerHealth(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getServerHealth(id);
  }

  // ─── Payments ─────────────────────────────────────────

  @Get('payments')
  @UseGuards(AdminAuthGuard)
  getPayments(@Query() query: PaymentFilterQuery) {
    return this.adminService.getPayments(
      query.page || 1,
      query.limit || 20,
      query.status,
      query.method,
      query.userId,
    );
  }

  // ─── Promo Codes ──────────────────────────────────────

  @Get('promos')
  @UseGuards(AdminAuthGuard)
  getPromos(@Query() query: PaginationQuery) {
    return this.adminService.getAllPromos(query.page || 1, query.limit || 20);
  }

  @Post('promos')
  @UseGuards(AdminAuthGuard)
  createPromo(@Body() dto: CreatePromoDto) {
    return this.adminService.createPromo(dto);
  }

  @Patch('promos/:id')
  @UseGuards(AdminAuthGuard)
  updatePromo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromoDto,
  ) {
    return this.adminService.updatePromo(id, dto);
  }

  @Delete('promos/:id')
  @UseGuards(AdminAuthGuard)
  deletePromo(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deletePromo(id);
  }

  // ─── Personal Discounts ──────────────────────────────

  @Get('personal-discounts')
  @UseGuards(AdminAuthGuard)
  getPersonalDiscounts(@Query() query: PersonalDiscountFilterQuery) {
    return this.adminService.getPersonalDiscounts(
      query.page || 1,
      query.limit || 20,
      query.userId,
    );
  }

  @Post('personal-discounts')
  @UseGuards(AdminAuthGuard)
  createPersonalDiscount(@Body() dto: CreatePersonalDiscountDto) {
    return this.adminService.createPersonalDiscount(dto);
  }

  @Delete('personal-discounts/:id')
  @UseGuards(AdminAuthGuard)
  deletePersonalDiscount(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deletePersonalDiscount(id);
  }

  // ─── Support Tickets ─────────────────────────────────

  @Get('support/tickets')
  @UseGuards(AdminAuthGuard)
  getTickets(@Query() query: TicketFilterQuery) {
    return this.supportService.getTickets(
      query.page || 1,
      query.limit || 20,
      query.status,
    );
  }

  @Get('support/tickets/count')
  @UseGuards(AdminAuthGuard)
  getOpenTicketCount() {
    return this.supportService.getOpenTicketCount();
  }

  @Get('support/tickets/:id')
  @UseGuards(AdminAuthGuard)
  getTicket(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.getTicketById(id);
  }

  @Post('support/tickets/:id/reply')
  @UseGuards(AdminAuthGuard)
  async replyTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyTicketDto,
  ) {
    const result = await this.supportService.replyFromAdmin(id, dto.text);
    this.adminService.logAction('reply_ticket', { ticketId: id });
    return result;
  }

  @Post('support/tickets/:id/close')
  @UseGuards(AdminAuthGuard)
  async closeTicket(@Param('id', ParseIntPipe) id: number) {
    const result = await this.supportService.closeTicket(id);
    this.adminService.logAction('close_ticket', { ticketId: id });
    return result;
  }

  // ─── Broadcast ────────────────────────────────────────

  @Post('broadcast')
  @UseGuards(AdminAuthGuard)
  async broadcast(@Body() dto: BroadcastDto) {
    const result = await this.adminService.broadcastMessage(
      dto.text,
      dto.onlyActive || false,
    );
    if (dto.postToChannel) {
      await this.adminService.postToChannel(dto.text);
    }
    this.adminService.logAction('broadcast', {
      onlyActive: dto.onlyActive,
      postToChannel: dto.postToChannel,
      ...result,
    });
    return result;
  }

  @Post('channel/post')
  @UseGuards(AdminAuthGuard)
  async postToChannel(@Body() dto: { text: string }) {
    const success = await this.adminService.postToChannel(dto.text);
    this.adminService.logAction('channel_post', { success });
    return { success };
  }
}
