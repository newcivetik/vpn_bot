import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import type { PersonalDiscount } from '../api/types.ts';
import { Plus } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

const emptyDiscount = { userId: 0, discountPercent: 0, bonusDays: 0, reason: '', expiresAt: '' };

export function PersonalDiscountsPage() {
  const [data, setData] = useState<PersonalDiscount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editDiscount, setEditDiscount] = useState<typeof emptyDiscount | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getPersonalDiscounts(page, 20);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editDiscount || !editDiscount.userId) {
      toast('Укажите ID пользователя', 'error');
      return;
    }
    try {
      await adminApi.createPersonalDiscount({
        userId: editDiscount.userId,
        discountPercent: editDiscount.discountPercent,
        bonusDays: editDiscount.bonusDays,
        reason: editDiscount.reason || undefined,
        expiresAt: editDiscount.expiresAt || undefined,
      });
      toast('Скидка создана, уведомление отправлено');
      setEditDiscount(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка создания', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deletePersonalDiscount(deleteId);
      toast('Скидка удалена');
      setDeleteId(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка удаления', 'error');
    }
  };

  const columns: Column<PersonalDiscount>[] = [
    { key: 'id', header: 'ID' },
    {
      key: 'user',
      header: 'Пользователь',
      render: (d) => d.user
        ? `#${d.userId} ${d.user.firstName || d.user.username || d.user.telegramId}`
        : `#${d.userId}`,
    },
    { key: 'discountPercent', header: 'Скидка %' },
    { key: 'bonusDays', header: 'Бонус дней' },
    { key: 'reason', header: 'Причина', render: (d) => d.reason || '—' },
    {
      key: 'expiresAt',
      header: 'Истекает',
      render: (d) => d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('ru-RU') : '—',
    },
    {
      key: 'isUsed',
      header: 'Статус',
      render: (d) => <StatusBadge status={d.isUsed ? 'expired' : 'active'} />,
    },
    {
      key: 'createdAt',
      header: 'Создана',
      render: (d) => new Date(d.createdAt).toLocaleDateString('ru-RU'),
    },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }}
          className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
        >
          Удалить
        </button>
      ),
    },
  ];

  return (
    <>
      <Header title="Персональные скидки" />
      <div className="p-6 space-y-4">
        <button
          onClick={() => setEditDiscount({ ...emptyDiscount })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> Назначить скидку
        </button>
        <DataTable columns={columns} data={data} loading={loading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      <Modal
        title="Новая персональная скидка"
        open={editDiscount !== null}
        onClose={() => setEditDiscount(null)}
        footer={
          <>
            <button onClick={() => setEditDiscount(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Создать</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">ID пользователя</label>
            <input type="number" value={editDiscount?.userId || ''} onChange={(e) => setEditDiscount({ ...editDiscount!, userId: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Внутренний ID" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Скидка (%)</label>
            <input type="number" value={editDiscount?.discountPercent ?? 0} onChange={(e) => setEditDiscount({ ...editDiscount!, discountPercent: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Бонус дней</label>
            <input type="number" value={editDiscount?.bonusDays ?? 0} onChange={(e) => setEditDiscount({ ...editDiscount!, bonusDays: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min={0} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Причина</label>
            <input type="text" value={editDiscount?.reason ?? ''} onChange={(e) => setEditDiscount({ ...editDiscount!, reason: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Лояльный клиент, возврат и т.д." />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Действует до</label>
            <input type="date" value={editDiscount?.expiresAt ?? ''} onChange={(e) => setEditDiscount({ ...editDiscount!, expiresAt: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <p className="text-xs text-slate-400">Пользователь получит уведомление в боте о скидке</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить скидку"
        message="Персональная скидка будет удалена. Продолжить?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Удалить"
        danger
      />
    </>
  );
}
