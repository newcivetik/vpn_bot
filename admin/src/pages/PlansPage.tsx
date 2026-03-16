import { useEffect, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import type { Plan } from '../api/types.ts';
import { Plus } from 'lucide-react';

const emptyPlan = { name: '', slug: '', price: 0, priceStars: 0, trafficLimitGB: 0, durationDays: 30, maxDevices: 1, sortOrder: 0 };

export function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<Partial<Plan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getPlans().then((p) => { setPlans(p); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editPlan) return;
    if (isNew) {
      await adminApi.createPlan(editPlan);
    } else {
      await adminApi.updatePlan(editPlan.id!, editPlan);
    }
    setEditPlan(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await adminApi.deletePlan(deleteId);
    setDeleteId(null);
    load();
  };

  const columns: Column<Plan>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Название' },
    { key: 'slug', header: 'Slug' },
    { key: 'price', header: 'Цена (₽)' },
    { key: 'priceStars', header: 'Stars' },
    { key: 'trafficLimitGB', header: 'Трафик ГБ', render: (p) => p.trafficLimitGB || 'Безлимит' },
    { key: 'durationDays', header: 'Дней' },
    { key: 'maxDevices', header: 'Устройств' },
    { key: 'isActive', header: 'Активен', render: (p) => <StatusBadge status={p.isActive ? 'active' : 'expired'} /> },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setEditPlan(p); setIsNew(false); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Ред.</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Удалить</button>
        </div>
      ),
    },
  ];

  const field = (label: string, key: keyof typeof emptyPlan, type = 'text') => (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={(editPlan as Record<string, unknown>)?.[key] as string ?? ''}
        onChange={(e) => setEditPlan({ ...editPlan, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      />
    </div>
  );

  return (
    <>
      <Header title="Тарифы" />
      <div className="p-6 space-y-4">
        <button
          onClick={() => { setEditPlan(emptyPlan); setIsNew(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> Создать тариф
        </button>
        <DataTable columns={columns} data={plans} loading={loading} />
      </div>

      <Modal
        title={isNew ? 'Новый тариф' : 'Редактирование тарифа'}
        open={editPlan !== null}
        onClose={() => setEditPlan(null)}
        footer={
          <>
            <button onClick={() => setEditPlan(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Отмена</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Сохранить</button>
          </>
        }
      >
        <div className="space-y-3">
          {field('Название', 'name')}
          {field('Slug', 'slug')}
          {field('Цена (₽)', 'price', 'number')}
          {field('Цена (Stars)', 'priceStars', 'number')}
          {field('Трафик (ГБ, 0 = безлимит)', 'trafficLimitGB', 'number')}
          {field('Длительность (дней)', 'durationDays', 'number')}
          {field('Макс. устройств', 'maxDevices', 'number')}
          {field('Порядок сортировки', 'sortOrder', 'number')}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить тариф"
        message="Тариф будет деактивирован. Продолжить?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Удалить"
        danger
      />
    </>
  );
}
