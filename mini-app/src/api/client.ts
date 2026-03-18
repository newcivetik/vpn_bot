const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('VITE_API_URL is not configured');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API error: ${res.status}`);
  }
  return res.json();
}

function authHeaders(initData: string): HeadersInit {
  return { 'X-Init-Data': initData };
}

export interface PlanDTO {
  id: number;
  name: string;
  slug: string;
  price: number;
  priceStars: number;
  trafficLimitGB: number;
  durationDays: number;
  maxDevices: number;
}

export interface SubscriptionDTO {
  id: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  trafficUsedGB: number;
  connectionLink: string;
  plan: PlanDTO;
  serverId: number;
  server?: ServerDTO;
}

export interface ServerDTO {
  id: number;
  location: string;
  maxClients: number;
  currentClients: number;
  isActive: boolean;
  recommended?: boolean;
}

export const api = {
  getPlans: () => request<PlanDTO[]>('/plans'),

  getSubscription: (initData: string) =>
    request<SubscriptionDTO | null>('/subscription', {
      headers: authHeaders(initData),
    }),

  getSubscriptions: (initData: string) =>
    request<SubscriptionDTO[]>('/subscriptions', {
      headers: authHeaders(initData),
    }),

  createInvoice: (planId: number, initData: string) =>
    request<{ invoiceLink: string }>('/create-invoice', {
      method: 'POST',
      body: JSON.stringify({ planId, initData }),
    }),

  createYokassaPayment: (planId: number, initData: string) =>
    request<{ confirmationToken: string }>('/create-yokassa-payment', {
      method: 'POST',
      body: JSON.stringify({ planId, initData }),
    }),

  getProfile: (initData: string) =>
    request<{
      referralCode: string;
      referralCount: number;
      referralBonusDays: number;
      isReturning: boolean;
      totalSubscriptions: number;
      notifyBeforeExpiry: boolean;
    } | null>('/profile', {
      headers: authHeaders(initData),
    }),

  toggleNotifications: (enabled: boolean, initData: string) =>
    request<{ notifyBeforeExpiry: boolean }>('/profile/notifications', {
      method: 'POST',
      body: JSON.stringify({ enabled, initData }),
    }),

  validatePromo: (code: string, initData: string) =>
    request<{ valid: boolean; error?: string; discountPercent?: number; bonusDays?: number }>(
      '/validate-promo',
      {
        method: 'POST',
        body: JSON.stringify({ code, initData }),
      },
    ),

  getServers: () => request<ServerDTO[]>('/servers'),

  changeServer: (serverId: number, initData: string) =>
    request<SubscriptionDTO>('/subscription/change-server', {
      method: 'POST',
      body: JSON.stringify({ serverId, initData }),
    }),
};
