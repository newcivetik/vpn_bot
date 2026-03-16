import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import type { Subscription } from '../api/types.ts';

export function SubscriptionsPage() {
  const [data, setData] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const [cancelId, setCancelId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getSubscriptions(page, 20, status || undefined);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const handleExtend = async () => {
    if (!extendId) return;
    await adminApi.extendSubscription(extendId, Number(extendDays));
    setExtendId(null);
    load();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await adminApi.cancelSubscription(cancelId);
    setCancelId(null);
    load();
  };

  const columns: Column<Subscription>[] = [
    { key: 'id', header: 'ID' },
    {
      key: 'user',
      header: 'Пользователь',
      render: (s) => s.user?.username || s.user?.firstName || String(s.userId),
    },
    { key: 'plan', header: 'Тариф', render: (s) => s.plan?.name || String(s.planId) },
    { key: 'server', header: 'Сервер', render: (s) => s.server?.location || String(s.serverId) },
    { key: 'status', header: 'Статус', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'expiresAt',
      header: 'Истекает',
      render: (s) => new Date(s.expiresAt).toLocaleDateString('ru-RU'),
    },
    { key: 'trafficUsedGB', header: 'Трафик', render: (s) => `${s.trafficUsedGB} ГБ` },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setExtendId(s.id); }}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
          >
            Продлить
          </button>
          {s.status === 'active' && (
            <button
              onClick={(e) => { e.stopPropagation(); setCancelId(s.id); }}
              className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
            >
              Отменить
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="Подписки" />
      <div className="p-6 space-y-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="">Все статусы</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <DataTable columns={columns} data={data} loading={loading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      <Modal
        title="Продлить подписку"
        open={extendId !== null}
        onClose={() => setExtendId(null)}
        footer={
          <>
            <button onClick={() => setExtendId(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Отмена</button>
            <button onClick={handleExtend} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Продлить</button>
          </>
        }
      >
        <label className="block text-sm text-slate-600 mb-2">Количество дней</label>
        <input
          type="number"
          value={extendDays}
          onChange={(e) => setExtendDays(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          min={1}
        />
      </Modal>

      <ConfirmDialog
        open={cancelId !== null}
        title="Отменить подписку"
        message="Подписка будет отменена, VPN-клиент отключён. Продолжить?"
        onConfirm={handleCancel}
        onCancel={() => setCancelId(null)}
        confirmLabel="Отменить подписку"
        danger
      />
    </>
  );
}
