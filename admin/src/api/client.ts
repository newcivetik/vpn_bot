import axios from 'axios';
import { useAuthStore } from '../stores/authStore.ts';
import type {
  DashboardStats,
  RevenueDataPoint,
  UserGrowthDataPoint,
  SubscriptionChartDataPoint,
  User,
  Plan,
  Server,
  Subscription,
  Payment,
  PromoCode,
  PersonalDiscount,
  PaginatedResponse,
  ServerHealth,
  BroadcastResult,
  SupportTicket,
  SupportMessage,
  AdminLog,
  FunnelData,
} from './types.ts';

const api = axios.create({
  baseURL: '/api/admin',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/login')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    const message = err.response?.data?.message || err.message || 'Ошибка сервера';
    return Promise.reject(new Error(message));
  },
);

export const adminApi = {
  login: (password: string, totpCode?: string) =>
    api.post<{ token?: string; requiresTwoFactor?: boolean }>('/login', { password, totpCode }).then((r) => r.data),

  getDashboard: () =>
    api.get<DashboardStats>('/dashboard').then((r) => r.data),

  getRevenueChart: (days = 30) =>
    api.get<RevenueDataPoint[]>(`/dashboard/revenue-chart?days=${days}`).then((r) => r.data),

  getUserGrowth: (days = 30) =>
    api.get<UserGrowthDataPoint[]>(`/dashboard/user-growth?days=${days}`).then((r) => r.data),

  getSubscriptionChart: (days = 30) =>
    api.get<SubscriptionChartDataPoint[]>(`/dashboard/subscription-chart?days=${days}`).then((r) => r.data),

  getUsers: (page = 1, limit = 20, search?: string) =>
    api.get<PaginatedResponse<User>>('/users', { params: { page, limit, search } }).then((r) => r.data),

  getUser: (id: number) =>
    api.get<User>(`/users/${id}`).then((r) => r.data),

  getSubscriptions: (page = 1, limit = 20, status?: string, userId?: number) =>
    api.get<PaginatedResponse<Subscription>>('/subscriptions', { params: { page, limit, status, userId } }).then((r) => r.data),

  grantSubscription: (userId: number, planId: number, notify = true) =>
    api.post<Subscription>('/subscriptions/grant', { userId, planId, notify }).then((r) => r.data),

  extendSubscription: (id: number, days: number, notify = true) =>
    api.post<Subscription>(`/subscriptions/${id}/extend`, { days, notify }).then((r) => r.data),

  cancelSubscription: (id: number, notify = true) =>
    api.post<Subscription>(`/subscriptions/${id}/cancel`, { notify }).then((r) => r.data),

  getPlans: () =>
    api.get<Plan[]>('/plans').then((r) => r.data),

  createPlan: (data: Partial<Plan>) =>
    api.post<Plan>('/plans', data).then((r) => r.data),

  updatePlan: (id: number, data: Partial<Plan>) =>
    api.patch<Plan>(`/plans/${id}`, data).then((r) => r.data),

  deletePlan: (id: number) =>
    api.delete(`/plans/${id}`),

  getServers: () =>
    api.get<Server[]>('/servers').then((r) => r.data),

  createServer: (data: Partial<Server>) =>
    api.post<Server>('/servers', data).then((r) => r.data),

  updateServer: (id: number, data: Partial<Server>) =>
    api.patch<Server>(`/servers/${id}`, data).then((r) => r.data),

  deleteServer: (id: number) =>
    api.delete(`/servers/${id}`),

  getServerHealth: (id: number) =>
    api.get<ServerHealth>(`/servers/${id}/health`).then((r) => r.data),

  getPayments: (page = 1, limit = 20, status?: string, method?: string, userId?: number) =>
    api.get<PaginatedResponse<Payment>>('/payments', { params: { page, limit, status, method, userId } }).then((r) => r.data),

  getPromos: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<PromoCode>>('/promos', { params: { page, limit } }).then((r) => r.data),

  createPromo: (data: Partial<PromoCode>) =>
    api.post<PromoCode>('/promos', data).then((r) => r.data),

  updatePromo: (id: number, data: Partial<PromoCode>) =>
    api.patch<PromoCode>(`/promos/${id}`, data).then((r) => r.data),

  deletePromo: (id: number) =>
    api.delete(`/promos/${id}`),

  getPersonalDiscounts: (page = 1, limit = 20, userId?: number) =>
    api.get<PaginatedResponse<PersonalDiscount>>('/personal-discounts', { params: { page, limit, userId } }).then((r) => r.data),

  createPersonalDiscount: (data: { userId: number; discountPercent?: number; bonusDays?: number; reason?: string; expiresAt?: string }) =>
    api.post<PersonalDiscount>('/personal-discounts', data).then((r) => r.data),

  deletePersonalDiscount: (id: number) =>
    api.delete(`/personal-discounts/${id}`),

  broadcast: (text: string, onlyActive = false, postToChannel = false) =>
    api.post<BroadcastResult>('/broadcast', { text, onlyActive, postToChannel }).then((r) => r.data),

  postToChannel: (text: string) =>
    api.post<{ success: boolean }>('/channel/post', { text }).then((r) => r.data),

  // Support
  getTickets: (page = 1, limit = 20, status?: string) =>
    api.get<PaginatedResponse<SupportTicket>>('/support/tickets', { params: { page, limit, status } }).then((r) => r.data),

  getOpenTicketCount: () =>
    api.get<number>('/support/tickets/count').then((r) => r.data),

  getTicket: (id: number) =>
    api.get<SupportTicket>(`/support/tickets/${id}`).then((r) => r.data),

  replyTicket: (id: number, text: string) =>
    api.post<SupportMessage>(`/support/tickets/${id}/reply`, { text }).then((r) => r.data),

  closeTicket: (id: number) =>
    api.post<SupportTicket>(`/support/tickets/${id}/close`).then((r) => r.data),

  // Logs
  getLogs: (page = 1, limit = 50) =>
    api.get<PaginatedResponse<AdminLog>>('/logs', { params: { page, limit } }).then((r) => r.data),

  // Funnel
  getFunnel: (days = 30) =>
    api.get<FunnelData>(`/dashboard/funnel?days=${days}`).then((r) => r.data),

  // 2FA
  get2FAStatus: () =>
    api.get<{ enabled: boolean }>('/2fa/status').then((r) => r.data),

  setup2FA: () =>
    api.post<{ secret: string; uri: string; qrDataUrl: string }>('/2fa/setup').then((r) => r.data),

  enable2FA: (code: string) =>
    api.post<{ enabled: boolean }>('/2fa/enable', { code }).then((r) => r.data),

  disable2FA: (code: string) =>
    api.post<{ enabled: boolean }>('/2fa/disable', { code }).then((r) => r.data),
};
