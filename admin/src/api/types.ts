export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalActiveSubscriptions: number;
  totalRevenueRubles: number;
  totalRevenueStars: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  activeServers: number;
  expiringIn3Days: number;
  conversionRate: number;
  churnedWeek: number;
}

export interface RevenueDataPoint {
  date: string;
  stars: number;
  rubles: number;
}

export interface UserGrowthDataPoint {
  date: string;
  count: number;
}

export interface SubscriptionChartDataPoint {
  date: string;
  total: number;
  active: number;
}

export interface User {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  languageCode: string | null;
  referrerId: number | null;
  referralCode: string | null;
  referralBonusDays: number;
  notifyBeforeExpiry: boolean;
  createdAt: string;
  updatedAt: string;
  subscriptions?: Subscription[];
  payments?: Payment[];
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  priceStars: number;
  trafficLimitGB: number;
  durationDays: number;
  maxDevices: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  apiPort: number;
  username: string;
  password: string;
  inboundId: number;
  location: string;
  maxClients: number;
  currentClients: number;
  isActive: boolean;
}

export interface Subscription {
  id: number;
  userId: number;
  planId: number;
  serverId: number;
  vpnClientId: string;
  vpnClientEmail: string;
  status: 'active' | 'expired' | 'cancelled';
  expiresAt: string;
  trafficUsedGB: number;
  connectionLink: string;
  createdAt: string;
  user?: User;
  plan?: Plan;
  server?: Server;
}

export interface Payment {
  id: number;
  userId: number;
  subscriptionId: number | null;
  amount: number;
  method: 'stars' | 'yokassa';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  externalId: string | null;
  planId: number | null;
  discountPercent: number;
  promoCodeId: number | null;
  createdAt: string;
  user?: User;
}

export interface PromoCode {
  id: number;
  code: string;
  discountPercent: number;
  bonusDays: number;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PersonalDiscount {
  id: number;
  userId: number;
  discountPercent: number;
  bonusDays: number;
  reason: string | null;
  expiresAt: string | null;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  user?: User;
}

export interface ServerHealth {
  online: boolean;
  clientCount: number;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}
