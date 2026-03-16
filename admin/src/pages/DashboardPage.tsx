import { useEffect, useState } from 'react';
import { Users, CreditCard, DollarSign, Star, UserPlus, Server, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Header } from '../components/Header.tsx';
import { StatsCard } from '../components/StatsCard.tsx';
import { adminApi } from '../api/client.ts';
import type { DashboardStats, RevenueDataPoint, UserGrowthDataPoint } from '../api/types.ts';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [growth, setGrowth] = useState<UserGrowthDataPoint[]>([]);

  useEffect(() => {
    adminApi.getDashboard().then(setStats);
    adminApi.getRevenueChart(30).then(setRevenue);
    adminApi.getUserGrowth(30).then(setGrowth);
  }, []);

  if (!stats) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-6 text-slate-400">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Пользователи" value={stats.totalUsers} icon={Users} />
          <StatsCard title="Активных подписок" value={stats.totalActiveSubscriptions} icon={CreditCard} color="text-green-600" />
          <StatsCard title="Доход (руб)" value={`${stats.totalRevenueRubles.toLocaleString()} ₽`} icon={DollarSign} color="text-emerald-600" />
          <StatsCard title="Доход (Stars)" value={stats.totalRevenueStars} icon={Star} color="text-amber-500" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Новых сегодня" value={stats.newUsersToday} icon={UserPlus} color="text-blue-600" />
          <StatsCard title="Активных серверов" value={stats.activeServers} icon={Server} color="text-purple-600" />
          <StatsCard title="Истекают (3 дня)" value={stats.expiringIn3Days} icon={AlertTriangle} color="text-red-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
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

          <div className="bg-white rounded-xl border border-slate-200 p-5">
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
