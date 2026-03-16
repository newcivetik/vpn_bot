import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Repeat, BarChart3, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Header } from '../components/Header.tsx';
import { StatsCard } from '../components/StatsCard.tsx';
import { adminApi } from '../api/client.ts';
import type { Analytics } from '../api/types.ts';

export function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    adminApi.getAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <>
        <Header title="Аналитика" />
        <div className="p-6 text-slate-400">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <Header title="Аналитика" />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Конверсия"
            value={`${data.conversionRate}%`}
            icon={Target}
            color="text-green-600"
          />
          <StatsCard
            title="Churn rate (30д)"
            value={`${data.churnRate}%`}
            icon={data.churnRate > 30 ? TrendingDown : TrendingUp}
            color={data.churnRate > 30 ? 'text-red-500' : 'text-blue-600'}
          />
          <StatsCard
            title="LTV (руб)"
            value={`${data.avgLTV.toLocaleString()} ₽`}
            icon={DollarSign}
            color="text-emerald-600"
          />
          <StatsCard
            title="Средний чек"
            value={`${data.avgCheck.toLocaleString()} ₽`}
            icon={BarChart3}
            color="text-purple-600"
          />
        </div>

        {/* Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Воронка</h3>
          <div className="space-y-3">
            <FunnelRow label="Всего пользователей" value={data.totalUsers} percent={100} color="bg-blue-500" />
            <FunnelRow
              label="Платящих"
              value={data.payingUsers}
              percent={data.totalUsers > 0 ? (data.payingUsers / data.totalUsers) * 100 : 0}
              color="bg-green-500"
            />
            <FunnelRow
              label="Пришли по реферальной"
              value={data.totalReferrals}
              percent={data.totalUsers > 0 ? (data.totalReferrals / data.totalUsers) * 100 : 0}
              color="bg-purple-500"
            />
          </div>
        </div>

        {/* Retention */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Удержание (30 дней)</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} className="text-red-500" />
                  <span className="text-sm text-slate-600">Истекло подписок</span>
                </div>
                <span className="text-lg font-bold text-slate-800">{data.expiredLast30}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Repeat size={16} className="text-green-500" />
                  <span className="text-sm text-slate-600">Продлили</span>
                </div>
                <span className="text-lg font-bold text-green-600">{data.renewedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-orange-500" />
                  <span className="text-sm text-slate-600">Ушли (churn)</span>
                </div>
                <span className="text-lg font-bold text-red-500">{Math.max(0, data.expiredLast30 - data.renewedCount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Покупатели по дням (30д)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.funnelChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="buyers" name="Покупателей" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Referral stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Реферальная программа</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{data.totalReferrals}</div>
              <div className="text-xs text-slate-500 mt-1">Пришли по реферальной</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">
                {data.totalUsers > 0 ? Math.round((data.totalReferrals / data.totalUsers) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">От всех пользователей</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.payingUsers > 0 ? Math.round((data.totalReferrals / data.payingUsers) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">К платящим</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FunnelRow({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{value} ({Math.round(percent)}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(2, percent)}%` }} />
      </div>
    </div>
  );
}
