import { useState, useEffect } from 'react';
import { adminApi } from '../api/client.ts';
import type { AdminLog } from '../api/types.ts';

const actionLabels: Record<string, { label: string; color: string }> = {
  login: { label: 'Вход', color: 'bg-blue-100 text-blue-700' },
  grant_subscription: { label: 'Выдача подписки', color: 'bg-green-100 text-green-700' },
  extend_subscription: { label: 'Продление', color: 'bg-green-100 text-green-700' },
  cancel_subscription: { label: 'Отмена подписки', color: 'bg-red-100 text-red-700' },
  reply_ticket: { label: 'Ответ в тикете', color: 'bg-purple-100 text-purple-700' },
  close_ticket: { label: 'Закрытие тикета', color: 'bg-slate-100 text-slate-700' },
  broadcast: { label: 'Рассылка', color: 'bg-orange-100 text-orange-700' },
  create_plan: { label: 'Создание тарифа', color: 'bg-cyan-100 text-cyan-700' },
  create_server: { label: 'Добавление сервера', color: 'bg-cyan-100 text-cyan-700' },
  create_promo: { label: 'Создание промокода', color: 'bg-yellow-100 text-yellow-700' },
};

function getActionInfo(action: string) {
  return actionLabels[action] || { label: action, color: 'bg-slate-100 text-slate-700' };
}

export function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getLogs(page, 50);
      setLogs(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📋 Логи действий</h1>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Загрузка...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Нет записей</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Время</th>
                <th className="text-left px-4 py-3 font-medium">Действие</th>
                <th className="text-left px-4 py-3 font-medium">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const info = getActionInfo(log.action);
                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          >
            « Назад
          </button>
          <span className="text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          >
            Вперёд »
          </button>
        </div>
      )}
    </div>
  );
}
