import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { StatusCard } from '../components/StatusCard';
import { QuickStats } from '../components/QuickStats';
import { QuickActions } from '../components/QuickActions';
import { QRModal } from '../components/QRModal';
import { Zap, AlertTriangle, Shield, Globe, Wifi, Clock, RefreshCw } from 'lucide-react';

function useUptime(createdAt: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!createdAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return useMemo(() => {
    if (!createdAt) return null;
    const diff = Math.max(0, now - new Date(createdAt).getTime());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}д ${h}ч ${m}м`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [createdAt, now]);
}

export function HomePage() {
  const { subscription, setSubscription, firstName, setFirstName } = useUserStore();
  const { initData, tg } = useTelegram();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uptime = useUptime(subscription?.createdAt);

  useEffect(() => {
    const user = tg?.initDataUnsafe?.user;
    if (user?.first_name) {
      setFirstName(user.first_name);
    }

    if (initData) {
      api
        .getSubscription(initData)
        .then(setSubscription)
        .catch((e) => {
          console.error('Failed to load subscription:', e);
          setError('Не удалось загрузить подписку');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [initData, setSubscription, setFirstName, tg]);

  const handleRefresh = async () => {
    if (!initData || refreshing) return;
    setRefreshing(true);
    try {
      const sub = await api.getSubscription(initData);
      setSubscription(sub);
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-tg-secondary rounded-xl animate-pulse" />
        <div className="h-28 bg-tg-secondary rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-tg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-brand-red/10 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-brand-red shrink-0" />
          <div>
            <p className="text-sm font-medium text-tg-text">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                api.getSubscription(initData)
                  .then(setSubscription)
                  .catch((e) => {
                    console.error('Retry failed:', e);
                    setError('Не удалось загрузить подписку');
                  })
                  .finally(() => setLoading(false));
              }}
              className="text-xs text-tg-link mt-2 px-4 py-2.5 rounded-lg bg-tg-link/10 font-medium"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-4 space-y-4">
      {/* Greeting */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-tg-text tracking-tight">
            Привет{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-sm text-tg-hint mt-0.5">Твой VPN-щит</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Обновить"
          className="p-3 rounded-xl bg-tg-secondary active:scale-90 transition-transform"
        >
          <RefreshCw size={18} className={`text-tg-hint ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status card */}
      <StatusCard subscription={subscription} />

      {/* Uptime counter */}
      {subscription && uptime && (
        <div className="flex items-center justify-center gap-2 py-2 animate-fade-in">
          <Clock size={14} className="text-tg-hint" />
          <span className="text-sm text-tg-hint font-mono">{uptime}</span>
          <span className="text-xs text-tg-hint">активна</span>
        </div>
      )}

      {/* Quick stats (only if subscribed) */}
      {subscription && <QuickStats subscription={subscription} />}

      {/* Quick actions */}
      <QuickActions
        connectionLink={subscription?.connectionLink}
        onShowQR={() => setShowQR(true)}
      />

      {/* Connection tips for active users */}
      {subscription && (
        <div className="bg-tg-secondary rounded-3xl p-4 space-y-3 animate-slide-up">
          <h3 className="text-sm font-bold text-tg-text">Советы</h3>
          <div className="space-y-2">
            {[
              { icon: Shield, color: 'text-brand-purple', text: 'VLESS+Reality невидим для провайдера' },
              { icon: Globe, color: 'text-brand-blue', text: 'Работает во всех приложениях и браузерах' },
              { icon: Wifi, color: 'text-brand-green', text: 'Авто-подключение при потере сети' },
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <tip.icon size={16} className={tip.color} />
                <span className="text-xs text-tg-hint">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promo card when no subscription */}
      {!subscription && (
        <>
          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 py-2 animate-fade-in">
            <div className="text-center">
              <div className="text-lg font-bold text-tg-text">1,500+</div>
              <div className="text-[10px] text-tg-hint">пользователей</div>
            </div>
            <div className="w-px h-8 bg-tg-secondary" />
            <div className="text-center">
              <div className="text-lg font-bold text-tg-text">99.9%</div>
              <div className="text-[10px] text-tg-hint">uptime</div>
            </div>
            <div className="w-px h-8 bg-tg-secondary" />
            <div className="text-center">
              <div className="text-lg font-bold text-tg-text">10+</div>
              <div className="text-[10px] text-tg-hint">серверов</div>
            </div>
          </div>

          {/* Existing promo card below */}
          <div className="bg-gradient-primary rounded-3xl p-5 text-white animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={24} />
            <span className="font-bold text-lg">Начни прямо сейчас</span>
          </div>
          <p className="text-sm text-white/80 mb-4">
            Безопасный интернет за пару минут. VLESS+Reality — невидим для провайдера.
          </p>
          <button
            onClick={() => navigate('/plans')}
            className="w-full py-3 rounded-xl bg-white text-brand-purple font-bold active:scale-95 transition-all hover:shadow-lg hover:shadow-white/20"
          >
            Выбрать тариф
          </button>
        </div>
        </>
      )}

      {/* QR Modal */}
      {showQR && subscription?.connectionLink && (
        <QRModal
          connectionLink={subscription.connectionLink}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
