import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ServerDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { Globe, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '../components/Toast';

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
  if (pct < 0.5) return 'bg-[#7DD4A8]';
  if (pct < 0.8) return 'bg-[#FFD4B8]';
  return 'bg-[#FFB6C1]';
}

export function ServerPage() {
  const [servers, setServers] = useState<ServerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { subscription, setSubscription } = useUserStore();
  const { initData, haptic } = useTelegram();
  const navigate = useNavigate();

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
      toast('Сервер переключён');
    } catch {
      haptic?.notificationOccurred('error');
      toast('Не удалось сменить сервер', 'error');
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-40 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-4 space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-[#3D2C4E]">Серверы</h1>
        <p className="text-sm font-semibold text-[#9B8AAB]">
          {subscription ? 'Выбери сервер для подключения' : 'Доступные локации'}
        </p>
      </div>

      {error && (
        <div className="bg-[#FFB6C1]/15 rounded-3xl p-4 flex items-center gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-[#FFB6C1] shrink-0" />
          <p className="text-sm text-[#3D2C4E]">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {servers.map((server, i) => {
          const isCurrent = subscription?.serverId === server.id;
          const loadPct = Math.round((server.currentClients / server.maxClients) * 100);
          const loadColor = getLoadColor(server.currentClients, server.maxClients);

          return (
            <div
              key={server.id}
              className="animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <button
                onClick={() => handleSwitch(server.id)}
                disabled={!subscription || isCurrent || switching !== null}
                aria-label={`Сервер ${server.location}, загрузка ${loadPct}%${isCurrent ? ', текущий' : ''}`}
                className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 shadow-[0_4px_20px_rgba(100,60,120,0.08)] hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-gradient-to-br from-[#D4F7E8] to-[#C1F0DB] shadow-[0_8px_32px_rgba(100,60,120,0.10)] border-2 border-[#7DD4A8]/30'
                    : 'bg-white border-2 border-transparent'
                } ${!subscription ? 'opacity-50' : ''}`}
              >
                <span className="text-3xl">{getFlag(server.location)}</span>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#3D2C4E]">{server.location}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-extrabold bg-[#C1F0DB] text-[#2D8B5E] px-2.5 py-0.5 rounded-full">
                        Текущий
                      </span>
                    )}
                    {server.recommended && !isCurrent && (
                      <span className="text-[10px] font-extrabold bg-[#E8D5F5] text-[#6B4A8A] px-2.5 py-0.5 rounded-full">
                        Лучший
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-[#E8D5F5]/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${loadColor}`}
                        style={{ width: `${loadPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#9B8AAB] w-8 text-right">{loadPct}%</span>
                  </div>
                </div>

                {switching === server.id ? (
                  <Loader2 size={18} className="text-[#C9A0F0] animate-spin" />
                ) : isCurrent ? (
                  <Check size={18} className="text-[#7DD4A8]" />
                ) : (
                  <Globe size={18} className="text-[#9B8AAB]" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!subscription && (
        <div className="text-center py-3 animate-fade-in">
          <p className="text-xs text-[#9B8AAB] mb-2">Оформи подписку, чтобы выбрать сервер</p>
          <button
            onClick={() => navigate('/plans')}
            className="bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white rounded-[50px] px-6 py-2.5 text-xs font-extrabold shadow-[0_6px_24px_rgba(160,130,210,0.3)] active:scale-95 transition-transform"
          >
            Выбрать тариф
          </button>
        </div>
      )}
    </div>
  );
}
