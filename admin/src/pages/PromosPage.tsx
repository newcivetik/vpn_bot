import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import type { PromoCode } from '../api/types.ts';
import { Plus } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

const emptyPromo = { code: '', discountPercent: 0, bonusDays: 0, maxUses: 0, expiresAt: '', isActive: true };

export function PromosPage() {
  const [data, setData] = useState<PromoCode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editPromo, setEditPromo] = useState<Partial<PromoCode> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getPromos(page, 20);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editPromo) return;
    if (!editPromo.code || editPromo.code.length < 3 || editPromo.code.length > 20) {
      toast('Код должен быть от 3 до 20 символов', 'error');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(editPromo.code)) {
      toast('Код может содержать только буквы и цифры', 'error');
      return;
    }
    if ((editPromo.discountPercent || 0) === 0 && (editPromo.bonusDays || 0) === 0) {
      toast('Укажите скидку или бонусные дни', 'error');
      return;
    }
    if (editPromo.expiresAt && new Date(editPromo.expiresAt) <= new Date()) {
      toast('Дата истечения должна быть в будущем', 'error');
      return;
    }
    try {
      if (isNew) {
        await adminApi.createPromo(editPromo);
        toast('Промокод создан');
      } else {
        await adminApi.updatePromo(editPromo.id!, editPromo);
        toast('Промокод обновлён');
      }
      setEditPromo(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка сохранения', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deletePromo(deleteId);
      toast('Промокод удалён');
      setDeleteId(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Ошибка удаления', 'error');
    }
  };

  const columns: Column<PromoCode>[] = [
    { key: 'id', header: 'ID' },
    { key: 'code', header: 'Код' },
    { key: 'discountPercent', header: 'Скидка %' },
    { key: 'bonusDays', header: 'Бонус дней' },
    { key: 'uses', header: 'Исп-ия', render: (p) => `${p.currentUses}${p.maxUses > 0 ? ` / ${p.maxUses}` : ''}` },
    {
      key: 'expiresAt',
      header: 'Истекает',
      render: (p) => p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('ru-RU') : '—',
    },
    { key: 'isActive', header: 'Активен', render: (p) => <StatusBadge status={p.isActive ? 'active' : 'expired'} /> },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setEditPromo(p); setIsNew(false); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Ред.</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Удалить</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="Промокоды" />
      <div className="p-6 space-y-4">
        <button
          onClick={() => { setEditPromo(emptyPromo); setIsNew(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> Создать промокод
        </button>
        <DataTable columns={columns} data={data} loading={loading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>

      <Modal
        title={isNew ? 'Новый промокод' : 'Редактирование промокода'}
        open={editPromo !== null}
        onClose={() => setEditPromo(null)}
        footer={
          <>
            <button onClick={() => setEditPromo(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Сохранить</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Код</label>
            <input type="text" value={editPromo?.code ?? ''} onChange={(e) => setEditPromo({ ...editPromo, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Скидка (%)</label>
            <input type="number" value={editPromo?.discountPercent ?? 0} onChange={(e) => setEditPromo({ ...editPromo, discountPercent: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Бонус дней</label>
            <input type="number" value={editPromo?.bonusDays ?? 0} onChange={(e) => setEditPromo({ ...editPromo, bonusDays: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min={0} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Макс. использований (0 = безлимит)</label>
            <input type="number" value={editPromo?.maxUses ?? 0} onChange={(e) => setEditPromo({ ...editPromo, maxUses: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" min={0} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Истекает</label>
            <input type="date" value={editPromo?.expiresAt ? editPromo.expiresAt.slice(0, 10) : ''} onChange={(e) => setEditPromo({ ...editPromo, expiresAt: e.target.value || null })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить промокод"
        message="Промокод будет деактивирован. Продолжить?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Удалить"
        danger
      />
    </>
  );
}
