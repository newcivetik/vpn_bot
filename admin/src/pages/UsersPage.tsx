import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { SearchInput } from '../components/SearchInput.tsx';
import { adminApi } from '../api/client.ts';
import type { User } from '../api/types.ts';

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
        <div className="max-w-sm">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Поиск по имени или Telegram ID..."
          />
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
