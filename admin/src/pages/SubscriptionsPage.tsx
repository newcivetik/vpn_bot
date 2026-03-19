import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { Modal } from '../components/Modal.tsx';
import { adminApi } from '../api/client.ts';
import type { Subscription, Plan } from '../api/types.ts';
import { Plus, Download, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/exportExcel.ts';
import { SearchInput } from '../components/SearchInput.tsx';
import { toast } from '../components/Toast.tsx';

export function SubscriptionsPage() {
  const [data, setData] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const [cancelId, setCancelId] = useState<number | null>(null);

  // Grant subscription state
  const [showGrant, setShowGrant] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlanId, setGrantPlanId] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState('');

  // Notify checkboxes
  const [grantNotify, setGrantNotify] = useState(true);
  const [extendNotify, setExtendNotify] = useState(true);
  const [cancelNotify, setCancelNotify] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const userId = search ? (isNaN(Number(search)) ? undefined : Number(search)) : undefined;
    const res = await adminApi.getSubscriptions(page, 20, status || undefined, userId);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const [extending, setExtending] = useState(false);

  const handleExtend = async () => {
    if (!extendId || extending) return;
    setExtending(true);
    try {
      await adminApi.extendSubscription(extendId, Number(extendDays), extendNotify);
      setExtendId(null);
      toast(`Подписка #${extendId} продлена на ${extendDays} дн.`);
      load();
    } catch (e) {
      console.error('Extend failed:', e);
      toast('Ошибка продления', 'error');
    } finally {
      setExtending(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await adminApi.cancelSubscription(cancelId, cancelNotify);
      toast(`Подписка #${cancelId} отменена`);
      setCancelId(null);
      load();
    } catch (e) {
      console.error('Cancel failed:', e);
      toast('Ошибка отмены', 'error');
      setCancelId(null);
    }
  };

  const openGrant = async () => {
    setShowGrant(true);
    setGrantError('');
    if (plans.length === 0) {
      const p = await adminApi.getPlans();
      setPlans(p.filter((pl) => pl.isActive));
      if (p.length > 0 && !grantPlanId) setGrantPlanId(String(p[0].id));
    }
  };

  const handleGrant = async () => {
    if (!grantUserId || !grantPlanId) return;
    setGranting(true);
    setGrantError('');
    try {
      await adminApi.grantSubscription(Number(grantUserId), Number(grantPlanId), grantNotify);
      setShowGrant(false);
      setGrantUserId('');
      toast('Подписка выдана');
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка создания подписки';
      setGrantError(msg);
    } finally {
      setGranting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const all = await adminApi.getSubscriptions(1, 50000, status || undefined);
      const rows = [
        ['ID', 'User', 'Plan', 'Server', 'Status', 'Expires', 'Traffic (GB)', 'Created'].join(','),
        ...all.data.map((s) =>
          [
            s.id,
            s.user?.username || s.user?.firstName || s.userId,
            s.plan?.name || s.planId,
            s.server?.location || s.serverId,
            s.status,
            new Date(s.expiresAt).toLocaleDateString('ru-RU'),
            s.trafficUsedGB,
            new Date(s.createdAt).toLocaleDateString('ru-RU'),
          ].join(',')
        ),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV скачан');
    } catch {
      toast('Ошибка экспорта', 'error');
    }
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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={openGrant}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Выдать подписку
          </button>
          <div className="max-w-[200px]">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="User ID..."
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={async () => {
              const all = await adminApi.getSubscriptions(1, 10000, status || undefined);
              exportToExcel(all.data.map((s: Subscription) => ({
                ...s,
                userName: s.user?.firstName || s.user?.username || '',
                planName: s.plan?.name || '',
                serverLocation: s.server?.location || '',
              })), [
                { key: 'id', header: 'ID' },
                { key: 'userName', header: 'Пользователь' },
                { key: 'planName', header: 'Тариф' },
                { key: 'serverLocation', header: 'Сервер' },
                { key: 'status', header: 'Статус' },
                { key: 'expiresAt', header: 'Истекает' },
                { key: 'trafficUsedGB', header: 'Трафик (ГБ)' },
              ], 'subscriptions');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
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
        </div>
        <DataTable columns={columns} data={data} loading={loading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      {/* Grant subscription modal */}
      <Modal
        title="Выдать подписку"
        open={showGrant}
        onClose={() => setShowGrant(false)}
        footer={
          <>
            <button onClick={() => setShowGrant(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Отмена</button>
            <button
              onClick={handleGrant}
              disabled={granting || !grantUserId || !grantPlanId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {granting ? 'Создание...' : 'Выдать'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">ID пользователя (из таблицы Users)</label>
            <input
              type="number"
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Например: 1"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Тариф</label>
            <select
              value={grantPlanId}
              onChange={(e) => setGrantPlanId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price} ₽ / {p.durationDays} дн.
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={grantNotify}
              onChange={(e) => setGrantNotify(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Уведомить пользователя в Telegram</span>
          </label>
          {grantError && (
            <p className="text-sm text-red-600">{grantError}</p>
          )}
        </div>
      </Modal>

      {/* Extend modal */}
      <Modal
        title="Продлить подписку"
        open={extendId !== null}
        onClose={() => setExtendId(null)}
        footer={
          <>
            <button onClick={() => setExtendId(null)} disabled={extending} className="px-4 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-50">Отмена</button>
            <button onClick={handleExtend} disabled={extending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {extending ? 'Продление...' : 'Продлить'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-2">Количество дней</label>
            <input
              type="number"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              min={1}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={extendNotify}
              onChange={(e) => setExtendNotify(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Уведомить пользователя в Telegram</span>
          </label>
        </div>
      </Modal>

      <Modal
        title="Отменить подписку"
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        footer={
          <>
            <button onClick={() => setCancelId(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Назад</button>
            <button onClick={handleCancel} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              Отменить подписку
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Подписка будет отменена, VPN-клиент отключён. Продолжить?</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cancelNotify}
              onChange={(e) => setCancelNotify(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Уведомить пользователя в Telegram</span>
          </label>
        </div>
      </Modal>
    </>
  );
}
