import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { SearchInput } from '../components/SearchInput.tsx';
import { adminApi } from '../api/client.ts';
import type { User } from '../api/types.ts';
import { Download } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

export function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.getUsers(page, 20, search || undefined);
    setData(res.data);
    setTotal(res.total);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    try {
      const all = await adminApi.getUsers(1, 50000, search || undefined);
      const rows = [
        ['ID', 'Telegram ID', 'Username', 'Name', 'Referral Code', 'Bonus Days', 'Created'].join(','),
        ...all.data.map((u) =>
          [u.id, u.telegramId, u.username || '', u.firstName || '', u.referralCode || '', u.referralBonusDays, new Date(u.createdAt).toLocaleDateString('ru-RU')].join(',')
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
        </div>
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
        />
        <Pagination page={page} total={total} limit={20} onChange={setPage} />
      </div>
    </>
  );
}
