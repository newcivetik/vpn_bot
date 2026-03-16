const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
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
  trafficUsedGB: number;
  connectionLink: string;
  plan: PlanDTO;
}

export const api = {
  getPlans: () => request<PlanDTO[]>('/plans'),

  getSubscription: (initData: string) =>
    request<SubscriptionDTO | null>(
      `/subscription?initData=${encodeURIComponent(initData)}`,
    ),

  getSubscriptions: (initData: string) =>
    request<SubscriptionDTO[]>(
      `/subscriptions?initData=${encodeURIComponent(initData)}`,
    ),

  createInvoice: (planId: number, initData: string) =>
    request<{ invoiceLink: string }>('/create-invoice', {
      method: 'POST',
      body: JSON.stringify({ planId, initData }),
    }),
};
