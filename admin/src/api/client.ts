import axios from 'axios';
import { useAuthStore } from '../stores/authStore.ts';
import type {
  DashboardStats,
  RevenueDataPoint,
  UserGrowthDataPoint,
  User,
  Plan,
  Server,
  Subscription,
  Payment,
  PromoCode,
  PaginatedResponse,
  ServerHealth,
  BroadcastResult,
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
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const adminApi = {
  login: (password: string) =>
    api.post<{ token: string }>('/login', { password }).then((r) => r.data),

  getDashboard: () =>
    api.get<DashboardStats>('/dashboard').then((r) => r.data),

  getRevenueChart: (days = 30) =>
    api.get<RevenueDataPoint[]>(`/dashboard/revenue-chart?days=${days}`).then((r) => r.data),

  getUserGrowth: (days = 30) =>
    api.get<UserGrowthDataPoint[]>(`/dashboard/user-growth?days=${days}`).then((r) => r.data),

  getUsers: (page = 1, limit = 20, search?: string) =>
    api.get<PaginatedResponse<User>>('/users', { params: { page, limit, search } }).then((r) => r.data),

  getUser: (id: number) =>
    api.get<User>(`/users/${id}`).then((r) => r.data),

  getSubscriptions: (page = 1, limit = 20, status?: string, userId?: number) =>
    api.get<PaginatedResponse<Subscription>>('/subscriptions', { params: { page, limit, status, userId } }).then((r) => r.data),

  grantSubscription: (userId: number, planId: number) =>
    api.post<Subscription>('/subscriptions/grant', { userId, planId }).then((r) => r.data),

  extendSubscription: (id: number, days: number) =>
    api.post<Subscription>(`/subscriptions/${id}/extend`, { days }).then((r) => r.data),

  cancelSubscription: (id: number) =>
    api.post<Subscription>(`/subscriptions/${id}/cancel`).then((r) => r.data),

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

  broadcast: (text: string, onlyActive = false) =>
    api.post<BroadcastResult>('/broadcast', { text, onlyActive }).then((r) => r.data),
};
