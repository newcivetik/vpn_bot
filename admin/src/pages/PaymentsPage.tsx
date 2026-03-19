import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { adminApi } from '../api/client.ts';
import type { Payment } from '../api/types.ts';
import { Download, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/exportExcel.ts';
import { SearchInput } from '../components/SearchInput.tsx';
import { toast } from '../components/Toast.tsx';

export function PaymentsPage() {
  const [data, setData] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const userId = search ? (isNaN(Number(search)) ? undefined : Number(search)) : undefined;
    const res = await adminApi.getPayments(page, 20, status || undefined, method || undefined, userId);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page, status, method, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    try {
      const all = await adminApi.getPayments(1, 10000, status || undefined, method || undefined);
      const rows = [
        ['ID', 'User', 'Amount', 'Method', 'Status', 'External ID', 'Date'].join(','),
        ...all.data.map((p) =>
          [p.id, p.user?.username || p.userId, p.amount, p.method, p.status, p.externalId || '', new Date(p.createdAt).toLocaleDateString('ru-RU')].join(',')
        ),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV скачан');
    } catch {
      toast('Ошибка экспорта', 'error');
    }
  };

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
        <div className="flex gap-3 items-center flex-wrap">
          <div className="max-w-[200px]">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="User ID..."
            />
          </div>
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
          <button
            onClick={handleExportCSV}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={async () => {
              const all = await adminApi.getPayments(1, 10000, status || undefined, method || undefined);
              exportToExcel(all.data.map((p: Payment) => ({
                ...p,
                userName: p.user?.firstName || p.user?.username || '',
              })), [
                { key: 'id', header: 'ID' },
                { key: 'userName', header: 'Пользователь' },
                { key: 'amount', header: 'Сумма' },
                { key: 'method', header: 'Метод' },
                { key: 'status', header: 'Статус' },
                { key: 'externalId', header: 'External ID' },
                { key: 'createdAt', header: 'Дата' },
              ], 'payments');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100"
          >
            <FileSpreadsheet size={14} />
            Excel
          </button>
        </div>
        <DataTable columns={columns} data={data} loading={loading} />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>
    </>
  );
}
