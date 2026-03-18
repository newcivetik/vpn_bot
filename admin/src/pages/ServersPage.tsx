import { useEffect, useState } from 'react';
import { Header } from '../components/Header.tsx';
import { DataTable } from '../components/DataTable.tsx';
import type { Column } from '../components/DataTable.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { adminApi } from '../api/client.ts';
import type { Server, ServerHealth } from '../api/types.ts';
import { Plus, Activity, RefreshCw } from 'lucide-react';
import { toast } from '../components/Toast.tsx';

const emptyServer = { name: '', host: '', port: 443, apiPort: 2096, username: '', password: '', inboundId: 1, location: 'Нидерланды', maxClients: 100 };

export function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [editServer, setEditServer] = useState<Partial<Server> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [health, setHealth] = useState<Record<number, ServerHealth>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getServers().then((s) => { setServers(s); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const checkHealth = async (id: number) => {
    try {
      const h = await adminApi.getServerHealth(id);
      setHealth((prev) => ({ ...prev, [id]: h }));
    } catch {
      setHealth((prev) => ({ ...prev, [id]: { online: false, clientCount: 0 } }));
    }
  };

  const handleSave = async () => {
    if (!editServer || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (isNew) {
        await adminApi.createServer(editServer);
        toast('Сервер добавлен');
      } else {
        await adminApi.updateServer(editServer.id!, editServer);
        toast('Сервер обновлён');
      }
      setEditServer(null);
      load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const checkAllHealth = async () => {
    setCheckingAll(true);
    const active = servers.filter((s) => s.isActive);
    await Promise.allSettled(active.map((s) => checkHealth(s.id)));
    setCheckingAll(false);
    toast(`Проверено ${active.length} серверов`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteServer(deleteId);
      setDeleteId(null);
      load();
    } catch {
      setDeleteId(null);
    }
  };

  const columns: Column<Server>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Имя' },
    { key: 'host', header: 'Хост' },
    { key: 'location', header: 'Локация' },
    { key: 'clients', header: 'Клиенты', render: (s) => `${s.currentClients} / ${s.maxClients}` },
    { key: 'isActive', header: 'Активен', render: (s) => <StatusBadge status={s.isActive ? 'active' : 'expired'} /> },
    {
      key: 'health',
      header: 'Здоровье',
      render: (s) => {
        const h = health[s.id];
        if (!h) return (
          <button onClick={(e) => { e.stopPropagation(); checkHealth(s.id); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Activity size={12} /> Проверить
          </button>
        );
        return <span className={`text-xs font-medium ${h.online ? 'text-green-600' : 'text-red-600'}`}>{h.online ? 'Online' : 'Offline'}</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); setEditServer(s); setIsNew(false); }} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Ред.</button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Удалить</button>
        </div>
      ),
    },
  ];

  const field = (label: string, key: keyof typeof emptyServer, type = 'text') => (
    <div>
      <label className="block text-sm text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={(editServer as Record<string, unknown>)?.[key] as string ?? ''}
        onChange={(e) => setEditServer({ ...editServer, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
      />
    </div>
  );

  return (
    <>
      <Header title="Серверы" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditServer(emptyServer); setIsNew(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Добавить сервер
          </button>
          <button
            onClick={checkAllHealth}
            disabled={checkingAll}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={checkingAll ? 'animate-spin' : ''} />
            {checkingAll ? 'Проверка...' : 'Проверить все'}
          </button>
        </div>
        <DataTable columns={columns} data={servers} loading={loading} />
      </div>

      <Modal
        title={isNew ? 'Новый сервер' : 'Редактирование сервера'}
        open={editServer !== null}
        onClose={() => setEditServer(null)}
        footer={
          <>
            <button onClick={() => setEditServer(null)} disabled={saving} className="px-4 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-50">Отмена</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {saveError && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{saveError}</div>
          )}
          {field('Название', 'name')}
          {field('Хост (IP/домен)', 'host')}
          {field('Порт VLESS', 'port', 'number')}
          {field('Порт API (3X-UI)', 'apiPort', 'number')}
          {field('Логин 3X-UI', 'username')}
          {field('Пароль 3X-UI', 'password', 'password')}
          {field('Inbound ID', 'inboundId', 'number')}
          {field('Локация', 'location')}
          {field('Макс. клиентов', 'maxClients', 'number')}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        title="Удалить сервер"
        message="Сервер будет деактивирован. Продолжить?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Удалить"
        danger
      />
    </>
  );
}
