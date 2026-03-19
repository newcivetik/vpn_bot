import { useEffect, useState, useCallback } from 'react';
import { Users, CreditCard, DollarSign, Star, UserPlus, Server, AlertTriangle, Activity, TrendingUp, UserMinus, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Header } from '../components/Header.tsx';
import { StatsCard } from '../components/StatsCard.tsx';
import { adminApi } from '../api/client.ts';
import type { DashboardStats, RevenueDataPoint, UserGrowthDataPoint, SubscriptionChartDataPoint, Server as ServerType, FunnelData } from '../api/types.ts';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [growth, setGrowth] = useState<UserGrowthDataPoint[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [subChart, setSubChart] = useState<SubscriptionChartDataPoint[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    setError('');
    const results = await Promise.allSettled([
      adminApi.getDashboard().then(setStats),
      adminApi.getRevenueChart(30).then(setRevenue),
      adminApi.getUserGrowth(30).then(setGrowth),
      adminApi.getServers().then(setServers),
      adminApi.getSubscriptionChart(30).then(setSubChart),
      adminApi.getFunnel(30).then(setFunnel),
    ]);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length === results.length) {
      setError('Не удалось загрузить данные');
    }
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [loadAll]);

  if (!stats) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-6 space-y-6">
          {error ? (
            <div className="text-center py-20">
              <div className="text-red-500 text-lg mb-2">{error}</div>
              <button onClick={loadAll} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Повторить</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse" />
                ))}
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  const activeServers = servers.filter((s) => s.isActive);

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
          <span>Обновлено: {lastRefresh.toLocaleTimeString('ru-RU')}</span>
          <button onClick={loadAll} disabled={refreshing} className="p-1 rounded hover:bg-slate-100">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Пользователи"
            value={stats.totalUsers}
            icon={Users}
            trend={{ value: stats.newUsersWeek, label: 'за неделю' }}
          />
          <StatsCard
            title="Активных подписок"
            value={stats.totalActiveSubscriptions}
            icon={CreditCard}
            color="text-green-600"
          />
          <StatsCard
            title="Доход (руб)"
            value={`${stats.totalRevenueRubles.toLocaleString()} ₽`}
            icon={DollarSign}
            color="text-emerald-600"
          />
          <StatsCard
            title="Доход (Stars)"
            value={stats.totalRevenueStars}
            icon={Star}
            color="text-amber-500"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Новых сегодня"
            value={stats.newUsersToday}
            icon={UserPlus}
            color="text-blue-600"
            trend={{ value: stats.newUsersMonth, label: 'за месяц' }}
          />
          <StatsCard
            title="Активных серверов"
            value={stats.activeServers}
            icon={Server}
            color="text-purple-600"
          />
          <StatsCard
            title="Конверсия"
            value={`${stats.conversionRate}%`}
            icon={TrendingUp}
            color="text-teal-600"
          />
          <StatsCard
            title="Истекают (3 дня)"
            value={stats.expiringIn3Days}
            icon={AlertTriangle}
            color="text-red-500"
          />
          <StatsCard
            title="Отток (7 дней)"
            value={stats.churnedWeek}
            icon={UserMinus}
            color="text-orange-500"
          />
        </div>

        {/* Server load widget */}
        {activeServers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-700">Загрузка серверов</h3>
            </div>
            <div className="space-y-3">
              {activeServers.map((server) => {
                const pct = server.maxClients > 0
                  ? Math.round((server.currentClients / server.maxClients) * 100)
                  : 0;
                const barColor = pct < 50 ? 'bg-green-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={server.id} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-28 truncate">{server.location}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-20 text-right">
                      {server.currentClients}/{server.maxClients} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Funnel */}
        {funnel && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Воронка (30 дней)</h3>
            <div className="space-y-3">
              {[
                { label: 'Регистрация', value: funnel.registered, pct: 100, color: 'bg-blue-500' },
                { label: 'Покупка', value: funnel.purchased, pct: funnel.conversionRate, color: 'bg-green-500' },
                { label: 'Продление', value: funnel.renewed, pct: funnel.retentionRate, color: 'bg-purple-500' },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-28">{step.label}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all flex items-center justify-end pr-2 ${step.color}`}
                      style={{ width: `${Math.max(step.pct, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{step.value}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{step.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription activity chart */}
        {subChart.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Подписки (30 дней)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={subChart}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" name="Всего" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="active" name="Активных" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Доход (30 дней)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenue}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="rubles" name="Рубли" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stars" name="Stars" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 animate-slide-up">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Рост пользователей (30 дней)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growth}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Новых" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
