import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { SearchInput } from '../components/SearchInput.tsx';
import { Modal } from '../components/Modal.tsx';
import { adminApi } from '../api/client.ts';
import type { User, Plan } from '../api/types.ts';
import { Download, FileSpreadsheet, Gift, Percent, MessageSquare } from 'lucide-react';
import { exportToExcel } from '../utils/exportExcel.ts';
import { toast } from '../components/Toast.tsx';

type BulkAction = 'grant' | 'discount' | 'message' | null;

export function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Bulk action form state
  const [selectedPlanId, setSelectedPlanId] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [bonusDays, setBonusDays] = useState(0);
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [messageText, setMessageText] = useState('');

  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers(page, 20, search || undefined);
      setData(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openBulkAction = async (action: BulkAction) => {
    setBulkAction(action);
    setMessageText('');
    setDiscountPercent(0);
    setBonusDays(0);
    setReason('');
    setExpiresAt('');
    if (action === 'grant' && plans.length === 0) {
      try {
        const p = await adminApi.getPlans();
        setPlans(p);
        if (p.length > 0) setSelectedPlanId(p[0].id);
      } catch { /* ignore */ }
    }
  };

  const closeBulkAction = () => {
    setBulkAction(null);
    setBulkLoading(false);
  };

  const executeBulkAction = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      let result: { sent: number; failed: number; total: number };
      if (bulkAction === 'grant') {
        result = await adminApi.bulkGrantSubscriptions(
          ids,
          selectedPlanId,
          messageText || undefined,
        );
      } else if (bulkAction === 'discount') {
        result = await adminApi.bulkCreatePersonalDiscounts(ids, {
          discountPercent: discountPercent || undefined,
          bonusDays: bonusDays || undefined,
          reason: reason || undefined,
          expiresAt: expiresAt || undefined,
          message: messageText || undefined,
        });
      } else {
        result = await adminApi.bulkSendMessage(ids, messageText);
      }
      toast(`Готово: ${result.sent} успешно, ${result.failed} ошибок`);
      setSelectedIds(new Set());
      closeBulkAction();
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const all = await adminApi.getUsers(1, 10000, search || undefined);
      const escapeCSV = (val: string | number | undefined | null): string => {
        const str = String(val ?? '');
        const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
        if (/[",\n\r]/.test(sanitized)) {
          return `"${sanitized.replace(/"/g, '""')}"`;
        }
        return sanitized;
      };
      const rows = [
        ['ID', 'Telegram ID', 'Username', 'Name', 'Referral Code', 'Bonus Days', 'Created'].join(','),
        ...all.data.map((u) =>
          [escapeCSV(u.id), escapeCSV(u.telegramId), escapeCSV(u.username), escapeCSV(u.firstName), escapeCSV(u.referralCode), escapeCSV(u.referralBonusDays), escapeCSV(new Date(u.createdAt).toLocaleDateString('ru-RU'))].join(',')
        ),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV скачан');
    } catch {
      toast('Ошибка экспорта', 'error');
    }
  };

  const columns: Column<User>[] = [
    { key: 'id', header: 'ID' },
    { key: 'telegramId', header: 'Telegram ID' },
    { key: 'username', header: 'Username', render: (u) => u.username || '—' },
    { key: 'firstName', header: 'Имя', render: (u) => u.firstName || '—' },
    { key: 'referralCode', header: 'Реф. код', render: (u) => u.referralCode || '—' },
    {
      key: 'createdAt',
      header: 'Создан',
      render: (u) => new Date(u.createdAt).toLocaleDateString('ru-RU'),
    },
  ];

  const canExecute =
    bulkAction === 'message' ? messageText.trim().length > 0 :
    bulkAction === 'grant' ? selectedPlanId > 0 :
    bulkAction === 'discount' ? (discountPercent > 0 || bonusDays > 0) :
    false;

  return (
    <>
      <Header title="Пользователи" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="max-w-sm flex-1">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Поиск по имени, ID или Telegram ID..."
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
              const all = await adminApi.getUsers(1, 10000);
              exportToExcel(all.data, [
                { key: 'id', header: 'ID' },
                { key: 'telegramId', header: 'Telegram ID' },
                { key: 'username', header: 'Username' },
                { key: 'firstName', header: 'Имя' },
                { key: 'referralCode', header: 'Реф. код' },
                { key: 'referralBonusDays', header: 'Бонус дней' },
                { key: 'createdAt', header: 'Дата' },
              ], 'users');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={load} className="text-red-700 underline text-xs">Повторить</button>
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm font-medium">
            Выбрано: {selectedIds.size}
          </span>
          <div className="w-px h-6 bg-slate-600" />
          <button
            onClick={() => openBulkAction('grant')}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm transition-colors"
          >
            <Gift size={14} />
            Подписка
          </button>
          <button
            onClick={() => openBulkAction('discount')}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm transition-colors"
          >
            <Percent size={14} />
            Скидка
          </button>
          <button
            onClick={() => openBulkAction('message')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            <MessageSquare size={14} />
            Сообщение
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-slate-400 hover:text-white text-sm ml-2"
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Grant subscription modal */}
      <Modal
        title={`Выдать подписку (${selectedIds.size} чел.)`}
        open={bulkAction === 'grant'}
        onClose={closeBulkAction}
        footer={
          <>
            <button onClick={closeBulkAction} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              Отмена
            </button>
            <button
              onClick={executeBulkAction}
              disabled={!canExecute || bulkLoading}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {bulkLoading ? 'Выполняется...' : 'Выдать'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Тариф</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {plans.filter(p => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.durationDays} дн.)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Сообщение пользователям <span className="text-slate-400 font-normal">(необязательно)</span>
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Поздравляем! Вам подарена подписка..."
              rows={4}
              maxLength={4096}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              Если не указано — уведомление не отправляется
            </p>
          </div>
        </div>
      </Modal>

      {/* Personal discount modal */}
      <Modal
        title={`Создать скидку (${selectedIds.size} чел.)`}
        open={bulkAction === 'discount'}
        onClose={closeBulkAction}
        footer={
          <>
            <button onClick={closeBulkAction} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              Отмена
            </button>
            <button
              onClick={executeBulkAction}
              disabled={!canExecute || bulkLoading}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {bulkLoading ? 'Выполняется...' : 'Создать'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Скидка %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Бонус дней</label>
              <input
                type="number"
                min={0}
                value={bonusDays}
                onChange={(e) => setBonusDays(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Причина</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Лояльный клиент, акция..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Действует до</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Сообщение пользователям <span className="text-slate-400 font-normal">(необязательно)</span>
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Поздравляем! Для вас персональная скидка..."
              rows={4}
              maxLength={4096}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              Если не указано — уведомление не отправляется
            </p>
          </div>
        </div>
      </Modal>

      {/* Send message modal */}
      <Modal
        title={`Отправить сообщение (${selectedIds.size} чел.)`}
        open={bulkAction === 'message'}
        onClose={closeBulkAction}
        footer={
          <>
            <button onClick={closeBulkAction} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              Отмена
            </button>
            <button
              onClick={executeBulkAction}
              disabled={!canExecute || bulkLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {bulkLoading ? 'Отправляется...' : 'Отправить'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Текст сообщения</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Введите текст поздравления..."
              rows={6}
              maxLength={4096}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">{messageText.length} / 4096</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
