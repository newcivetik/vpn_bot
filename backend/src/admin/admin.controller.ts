import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  ParseIntPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
  BroadcastDto,
  SubscriptionFilterQuery,
  PaymentFilterQuery,
} from './admin.dto';

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Auth (no guard) ──────────────────────────────────

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD');
    if (!adminPassword || dto.password !== adminPassword) {
      throw new UnauthorizedException('Invalid password');
    }
    const token = await this.jwtService.signAsync({ role: 'admin' });
    return { token };
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

  @Get('analytics')
  @UseGuards(AdminAuthGuard)
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ─── Users ────────────────────────────────────────────

  @Get('users')
  @UseGuards(AdminAuthGuard)
  getUsers(@Query() query: PaginationQuery) {
    return this.adminService.getUsers(query.page || 1, query.limit || 20, query.search);
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
  grantSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.adminService.grantSubscription(dto.userId, dto.planId);
  }

  @Post('subscriptions/:id/extend')
  @UseGuards(AdminAuthGuard)
  extendSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendSubscriptionDto,
  ) {
    return this.adminService.extendSubscription(id, dto.days);
  }

  @Post('subscriptions/:id/cancel')
  @UseGuards(AdminAuthGuard)
  cancelSubscription(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.cancelSubscription(id);
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
  updatePlan(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto) {
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
  updateServer(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServerDto) {
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
  updatePromo(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromoDto) {
    return this.adminService.updatePromo(id, dto);
  }

  @Delete('promos/:id')
  @UseGuards(AdminAuthGuard)
  deletePromo(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deletePromo(id);
  }

  // ─── Broadcast ────────────────────────────────────────

  @Post('broadcast')
  @UseGuards(AdminAuthGuard)
  broadcast(@Body() dto: BroadcastDto) {
    return this.adminService.broadcastMessage(dto.text, dto.onlyActive || false);
  }
}
