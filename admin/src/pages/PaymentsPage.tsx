import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { adminApi } from '../api/client.ts';
import type { Payment } from '../api/types.ts';

export function PaymentsPage() {
  const [data, setData] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getPayments(page, 20, status || undefined, method || undefined);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page, status, method]);

  useEffect(() => { load(); }, [load]);

  const columns: Column<Payment>[] = [
    { key: 'id', header: 'ID' },
    {
      key: 'user',
      header: 'Пользователь',
      render: (p) => p.user?.username || p.user?.firstName || String(p.userId),
    },
    { key: 'amount', header: 'Сумма' },
    { key: 'method', header: 'Метод', render: (p) => <StatusBadge status={p.method} /> },
    { key: 'status', header: 'Статус', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'externalId', header: 'External ID', render: (p) => p.externalId || '—' },
    {
      key: 'createdAt',
      header: 'Дата',
      render: (p) => new Date(p.createdAt).toLocaleDateString('ru-RU'),
    },
  ];

  return (
    <>
      <Header title="Платежи" />
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">Все статусы</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">Все методы</option>
            <option value="stars">Stars</option>
            <option value="yokassa">YooKassa</option>
          </select>
        </div>
        <DataTable columns={columns} data={data} loading={loading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>
    </>
  );
}
