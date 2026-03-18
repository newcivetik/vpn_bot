import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ServerDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { Globe, Check, AlertTriangle, Loader2 } from 'lucide-react';

const LOCATION_FLAGS: Record<string, string> = {
  Нидерланды: '🇳🇱',
  Германия: '🇩🇪',
  Финляндия: '🇫🇮',
  США: '🇺🇸',
  Сингапур: '🇸🇬',
  Турция: '🇹🇷',
  Великобритания: '🇬🇧',
  Франция: '🇫🇷',
  Япония: '🇯🇵',
  Канада: '🇨🇦',
};

function getFlag(location: string) {
  return LOCATION_FLAGS[location] || '🌐';
}

function getLoadColor(current: number, max: number) {
  const pct = current / max;
  if (pct < 0.5) return 'bg-brand-green';
  if (pct < 0.8) return 'bg-brand-amber';
  return 'bg-brand-red';
}

export function ServerPage() {
  const [servers, setServers] = useState<ServerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { subscription, setSubscription } = useUserStore();
  const { initData, haptic } = useTelegram();

  useEffect(() => {
    api
      .getServers()
      .then(setServers)
      .catch(() => setError('Не удалось загрузить серверы'))
      .finally(() => setLoading(false));
  }, []);

  const handleSwitch = async (serverId: number) => {
    if (!subscription || switching || serverId === subscription.serverId) return;
    haptic?.impactOccurred('medium');
    setSwitching(serverId);
    try {
      const updated = await api.changeServer(serverId, initData);
      setSubscription(updated);
      haptic?.notificationOccurred('success');
    } catch {
      setError('Не удалось сменить сервер');
      haptic?.notificationOccurred('error');
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-40 bg-tg-secondary rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-tg-secondary rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-4 space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-tg-text">Серверы</h1>
        <p className="text-sm text-tg-hint">
          {subscription ? 'Выбери сервер для подключения' : 'Доступные локации'}
        </p>
      </div>

      {error && (
        <div className="bg-brand-red/10 rounded-2xl p-3 flex items-center gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-brand-red shrink-0" />
          <p className="text-sm text-tg-text">{error}</p>
        </div>
      )}

      <div className="space-y-2 animate-slide-up">
        {servers.map((server) => {
          const isCurrent = subscription?.serverId === server.id;
          const loadPct = Math.round((server.currentClients / server.maxClients) * 100);
          const loadColor = getLoadColor(server.currentClients, server.maxClients);

          return (
            <button
              key={server.id}
              onClick={() => handleSwitch(server.id)}
              disabled={!subscription || isCurrent || switching !== null}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                isCurrent
                  ? 'bg-brand-purple/10 border-2 border-brand-purple'
                  : 'bg-tg-secondary border-2 border-transparent'
              } ${!subscription ? 'opacity-60' : ''}`}
            >
              <span className="text-2xl">{getFlag(server.location)}</span>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-tg-text">{server.location}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">
                      Текущий
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-tg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${loadColor}`}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-tg-hint w-8 text-right">{loadPct}%</span>
                </div>
              </div>

              {switching === server.id ? (
                <Loader2 size={18} className="text-brand-purple animate-spin" />
              ) : isCurrent ? (
                <Check size={18} className="text-brand-purple" />
              ) : (
                <Globe size={18} className="text-tg-hint" />
              )}
            </button>
          );
        })}
      </div>

      {!subscription && (
        <p className="text-xs text-tg-hint text-center px-4">
          Оформи подписку, чтобы выбрать сервер
        </p>
      )}
    </div>
  );
}
