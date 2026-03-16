import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { adminApi } from '../api/client.ts';
import type { User } from '../api/types.ts';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (id) adminApi.getUser(Number(id)).then(setUser);
  }, [id]);

  if (!user) {
    return (
      <>
        <Header title="Пользователь" />
        <div className="p-6 text-slate-400">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <Header title={`${user.firstName || user.username || 'User'} #${user.id}`} />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-slate-500">Telegram ID:</span> <strong>{user.telegramId}</strong></div>
          <div><span className="text-slate-500">Username:</span> <strong>{user.username || '—'}</strong></div>
          <div><span className="text-slate-500">Имя:</span> <strong>{user.firstName || '—'}</strong></div>
          <div><span className="text-slate-500">Реф. код:</span> <strong>{user.referralCode || '—'}</strong></div>
          <div><span className="text-slate-500">Бонус дней:</span> <strong>{user.referralBonusDays}</strong></div>
          <div><span className="text-slate-500">Реферер ID:</span> <strong>{user.referrerId || '—'}</strong></div>
          <div><span className="text-slate-500">Создан:</span> <strong>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</strong></div>
        </div>

        {user.subscriptions && user.subscriptions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Подписки</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Тариф</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Сервер</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Статус</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Истекает</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Трафик</th>
                  </tr>
                </thead>
                <tbody>
                  {user.subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">{sub.id}</td>
                      <td className="px-4 py-3">{sub.plan?.name || sub.planId}</td>
                      <td className="px-4 py-3">{sub.server?.location || sub.serverId}</td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-3">{new Date(sub.expiresAt).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3">{sub.trafficUsedGB} ГБ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {user.payments && user.payments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Платежи</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Сумма</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Метод</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Статус</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {user.payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">{p.id}</td>
                      <td className="px-4 py-3">{p.amount}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.method} /></td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
